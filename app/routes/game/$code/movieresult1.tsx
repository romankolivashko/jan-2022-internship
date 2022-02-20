import { Link, LoaderFunction, useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import back from "~/assets/img/back_blue.png";

//export const links = () => [{ rel: "stylesheet", href: modalResult }];

export const loader: LoaderFunction = async ({ request, params }) => {
  const slug = params.code;
  const game = await db.game.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!game) throw new Error("Game not found");
  const gameId = game.id;

  const topFive = await db.movieScore.findMany({
    take: 5,
    where: {
      game: { id: gameId },
      AND: [
        {
          movie: { id: params.movieId },
        },
      ],
    },
    select: { movieId: true, tmdb: true, likes: true },
    orderBy: { likes: "desc" },
  });

  async function callApi(tmdbId: string) {
    const BASE_URL = "https://api.themoviedb.org/3";
    const API_URL = `${BASE_URL}/movie/${tmdbId}/recommendations?api_key=${process.env.API_KEY}&vote_average.gte=5.0&vote_average.lte=8.0&vote_count.gte=1000`;
    try {
      const res = await fetch(API_URL);
      const movieData = await res.json();
      return movieData;
    } catch (err) {
      throw err;
      console.log(err);
    }
  }

  async function callApiGetDetails(tmdbId: string) {
    const BASE_URL = "https://api.themoviedb.org/3";
    const API_URL = `${BASE_URL}/movie/${tmdbId}?api_key=${process.env.API_KEY}&append_to_response=videos,runtime,revenue,budget`;
    try {
      const res = await fetch(API_URL);
      const movieData = await res.json();
      return movieData;
    } catch (err) {
      throw err;
      console.log(err);
    }
  }

  async function callApiGetCredits(tmdbId: string) {
    const BASE_URL = "https://api.themoviedb.org/3";
    const API_URL = `${BASE_URL}/movie/${tmdbId}/credits?api_key=${process.env.API_KEY}`;
    try {
      const res = await fetch(API_URL);
      const movieData = await res.json();
      return movieData;
    } catch (err) {
      throw err;
      console.log(err);
    }
  }

  const movie1 = await callApi(topFive[0].tmdb);
  const movie1Details = await callApiGetDetails(topFive[0].tmdb);
  console.log(movie1Details);
  const movie1Cast = await callApiGetCredits(topFive[0].tmdb);
  console.log(movie1Cast);

  return { topFive, slug, movie1, movie1Details, movie1Cast };
};

//Modal.setAppElement("#root");

export default function MovieResult1() {
  const { slug, movie1, movie1Details, movie1Cast } = useLoaderData();
  const IMG_URL = "https://image.tmdb.org/t/p/w500";
  const poster = IMG_URL + movie1.results[0].poster_path;
  console.log(movie1);
  const date = movie1.results[0].release_date;
  const datePattern = /(\d{4})/;
  const year = date.match(datePattern);
  console.log(movie1Cast);

  return (
    <>
      <div className="navigation">
        <Link to="/">
          <img src={back} alt="back button" />
        </Link>
      </div>
      <header className="modal-header">
        <button className="modal-btn-number ">1</button>
        <ul style={{ paddingLeft: 12 }}>
          <li>
            <h2>{movie1.results[0].title}</h2>
          </li>
          <li>
            <p>{year[0]}</p>
          </li>
        </ul>
      </header>
      <div>
        <img src={poster} alt="poster" className="modal-img" />
      </div>
      <div className="modal-grid-container">
        <div className="modal-grid-item">
          <ul>
            <li>
              GENRES <span></span>
            </li>
            <li>SCORE</li>
            <li>RUNTIME</li>
            <li>RATED</li>
            <li>DIRECTOR</li>
            <li>CAST</li>
          </ul>
        </div>
        <div className="grid-item">
          <h5>SYNOPSIS</h5>
          <p>{movie1.results[0].overview}</p>
        </div>
        <div className="grid-item">
          <h5>TRAILER</h5>
          <p>Trailer goes here</p>
        </div>
        <div className="grid-item">5</div>
      </div>
      <footer className="modal-footer ">
        <h5>WHERE TO WATCH</h5>
        <ul>
          <li>STREAM</li>
          <li>RENT</li>
          <li>BUY</li>
        </ul>
      </footer>
    </>
  );
}
