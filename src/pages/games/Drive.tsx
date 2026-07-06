import { useParams, Navigate } from 'react-router-dom';
import { DriveGame } from '../../game/DriveGame';
import { LESSON_BY_SLUG } from '../../game/lessons';

export default function Drive() {
  const { slug } = useParams();
  const lesson = slug ? LESSON_BY_SLUG[slug] : null;
  if (!lesson) return <Navigate to="/games" replace />;
  return <DriveGame key={lesson.slug} config={lesson} />;
}
