/**
 * GoDriving billing - one-time purchase of full access.
 *
 * Unlike foodlog (metered AI scans) nothing here costs money per use: the
 * practice tests and games are static content. So the product is a single
 * lifetime unlock rather than a pass that expires, which is also the easiest
 * thing to explain to someone studying for their licence: pay once, done.
 *
 * Free users get a daily practice allowance so the app is genuinely usable
 * before paying - the gate is "how much can you practise today", not "can you
 * see anything at all".
 */

import paystack from '../_lib/paystack/index.mjs';
import affiliate from '../_lib/affiliate/index.mjs';

/** One-time unlock. Kenyan learners see shillings; everyone else USD. */
export const PRODUCT = {
  id: 'full-access',
  name: 'GoDriving Full Access',
  blurb: 'Every practice test, every game, forever. One payment.',
  prices: { KES: 499, USD: 5 },
};

export const HOME_COUNTRY = 'KE';
export const HOME_CURRENCY = 'KES';

/** Practice sessions a free account may record per day. */
export const FREE_SESSIONS_PER_DAY = Number(process.env.FREE_SESSIONS_PER_DAY || 3);

export function currencyFor(req) {
  return paystack.currencyForRequest(req, {
    homeCountry: HOME_COUNTRY,
    homeCurrency: HOME_CURRENCY,
    awayCurrency: 'USD',
  });
}

export function priceFor(currency) {
  return paystack.priceFor(PRODUCT.prices, currency, HOME_CURRENCY);
}

export async function initBillingDb(q) {
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_full_access BOOLEAN NOT NULL DEFAULT FALSE`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMPTZ`);

  await q(`
    CREATE TABLE IF NOT EXISTS godriving_payments (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reference    TEXT UNIQUE NOT NULL,
      amount       NUMERIC(12,2) NOT NULL,
      currency     TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
  await q(`CREATE INDEX IF NOT EXISTS ix_godriving_payments_user ON godriving_payments(user_id)`);
}

/** Practice sessions this user has recorded in the last 24 hours. */
export async function sessionsToday(q, userId) {
  const { rows } = await q(
    `SELECT count(*)::int AS n FROM game_scores
      WHERE user_id = $1 AND created_at > NOW() - interval '1 day'`,
    [userId]
  );
  return rows[0]?.n ?? 0;
}

/**
 * Grant access for a paid reference - exactly once.
 *
 * Same conditional-UPDATE claim as everywhere else: Paystack reports success
 * on both the webhook and the browser redirect, usually within the same second.
 */
export async function grantAccess(q, payment) {
  const claimed = await q(
    `UPDATE godriving_payments
        SET status = 'completed', completed_at = NOW()
      WHERE id = $1 AND status <> 'completed'
      RETURNING *`,
    [payment.id]
  );

  if (!claimed.rows.length) return { granted: false };

  const row = claimed.rows[0];
  await q(
    `UPDATE users
        SET has_full_access = TRUE,
            access_granted_at = COALESCE(access_granted_at, NOW())
      WHERE id = $1`,
    [row.user_id]
  );

  // Pay whoever referred this learner. Only ever called from a server-side
  // confirmed payment, and keyed on the payment reference so a webhook retry
  // cannot pay the referrer twice.
  try {
    await affiliate.recordCommission(q, {
      site: 'godriving',
      userId: row.user_id,
      paymentRef: row.reference,
      amount: Number(row.amount),
      currency: row.currency,
    });
  } catch (err) {
    // A commission failure must never block the customer getting what they paid for.
    console.error('[affiliate] could not record commission for', row.reference, err.message);
  }

  return { granted: true, payment: row };
}

export function mountBilling(app, { q, wrap, auth, baseUrl }) {
  const enabled = () => paystack.paystackEnabled(process.env, console);

  /** What full access costs this visitor. */
  app.get('/api/billing/product', (req, res) => {
    const currency = currencyFor(req);
    res.json({
      product: {
        id: PRODUCT.id,
        name: PRODUCT.name,
        blurb: PRODUCT.blurb,
        price: priceFor(currency),
        currency,
        one_time: true,
      },
      free_sessions_per_day: FREE_SESSIONS_PER_DAY,
      payments_available: enabled(),
      test_mode: enabled() ? !paystack.isLiveMode(process.env) : null,
    });
  });

  /** This user's access state and remaining free practice for today. */
  app.get('/api/billing/me', auth, wrap(async (req, res) => {
    const used = await sessionsToday(q, req.user.id);
    res.json({
      has_full_access: !!req.user.has_full_access,
      access_granted_at: req.user.access_granted_at || null,
      free_sessions_per_day: FREE_SESSIONS_PER_DAY,
      sessions_used_today: used,
      sessions_left_today: req.user.has_full_access
        ? null
        : Math.max(0, FREE_SESSIONS_PER_DAY - used),
    });
  }));

  app.post('/api/billing/checkout', auth, wrap(async (req, res) => {
    if (!enabled()) {
      return res.status(503).json({ error: 'Payments are not available right now.' });
    }
    if (req.user.has_full_access) {
      return res.status(400).json({ error: 'You already have full access.' });
    }
    if (!req.user.email) {
      return res.status(400).json({ error: 'Add an email address to your account first.' });
    }

    const currency = currencyFor(req);
    const amount = priceFor(currency);
    const reference = paystack.newReference('gd');

    const { rows } = await q(
      `INSERT INTO godriving_payments (user_id, reference, amount, currency)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, reference, amount, currency]
    );
    const payment = rows[0];

    try {
      const data = await paystack.initializeTransaction({
        email: req.user.email,
        amount,
        currency,
        reference,
        callbackUrl: `${baseUrl}/billing/done`,
        metadata: { user_id: req.user.id, payment_id: payment.id, product: PRODUCT.id },
      });
      res.json({ reference, authorization_url: data.authorization_url, amount, currency });
    } catch (err) {
      await q(`UPDATE godriving_payments SET status = 'failed' WHERE id = $1`, [payment.id]);
      console.error('[billing] initialize failed', err.message);
      res.status(502).json({ error: `Could not start the payment: ${err.message}` });
    }
  }));

  app.get('/api/billing/verify/:reference', auth, wrap(async (req, res) => {
    const { rows } = await q(
      `SELECT * FROM godriving_payments WHERE reference = $1 AND user_id = $2`,
      [req.params.reference, req.user.id]
    );
    const payment = rows[0];
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });

    if (payment.status === 'completed') {
      return res.json({ status: 'success', already_processed: true, has_full_access: true });
    }

    let data;
    try {
      data = await paystack.verifyTransaction(payment.reference);
    } catch (err) {
      return res.status(502).json({ error: `Could not confirm the payment: ${err.message}` });
    }

    if (!paystack.isPaidInFull(data, Number(payment.amount))) {
      await q(`UPDATE godriving_payments SET status = 'failed' WHERE id = $1`, [payment.id]);
      return res.status(400).json({ error: data?.gateway_response || 'The payment was not completed.' });
    }

    const result = await grantAccess(q, payment);
    res.json({ status: 'success', already_processed: !result.granted, has_full_access: true });
  }));

  app.post('/api/billing/webhook', wrap(async (req, res) => {
    if (!enabled()) return res.status(503).json({ error: 'not configured' });

    const raw = req.rawBody;
    if (!raw) {
      console.error('[billing] webhook raw body missing - check the express.json verify hook');
      return res.status(400).json({ error: 'bad request' });
    }
    if (!paystack.verifyWebhookSignature(raw, req.headers['x-paystack-signature'], process.env)) {
      console.warn('[billing] rejected a webhook with an invalid signature');
      return res.status(401).json({ error: 'invalid signature' });
    }

    const event = req.body || {};
    const reference = event?.data?.reference;

    if (event.event === 'charge.success' && reference) {
      const { rows } = await q(`SELECT * FROM godriving_payments WHERE reference = $1`, [reference]);
      const payment = rows[0];
      if (!payment) {
        console.warn('[billing] webhook for unknown reference', reference);
      } else if (!paystack.isPaidInFull(event.data, Number(payment.amount))) {
        console.error('[billing] webhook amount mismatch on', reference, '- not granting');
      } else {
        await grantAccess(q, payment);
      }
    }

    res.json({ status: 'success' });
  }));
}
