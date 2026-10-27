import { useState } from "react";

export function LikeButton({ initial = 0 }) {
  const [likes, setLikes] = useState(initial);
  const liked = likes > initial;
  return (
    <button type="button" aria-pressed={liked} onClick={() => setLikes(likes + 1)}>
      Me gusta ({likes})
    </button>
  );
}
