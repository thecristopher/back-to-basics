import { LikeButton } from "./solution.jsx";

export default function Preview() {
  return (
    <>
      <h2>La foto de Claire en el muelle, con 41 me gusta</h2>
      <LikeButton initial={41} />
      <h2>Una foto nueva, sin la prop initial</h2>
      <LikeButton />
    </>
  );
}
