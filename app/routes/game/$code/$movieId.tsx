import {
  ActionFunction,
  Form,
  json,
  Link,
  LoaderFunction,
  redirect,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "remix";
//import Game from "~/routes/game";
import { db } from "~/utils/db.server";
import { getPlayer, requireUser } from "~/utils/session.server";
import movieStyles from "~/styles/movie.css";
import w3Styles from "~/styles/w3.css";
import back from "~/assets/img/back.png";
import home from "~/assets/img/home.png";
import like from "~/assets/img/like.png";
import dislike from "~/assets/img/dislike.png";
import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";

export const links = () => [
  { rel: "stylesheet", href: movieStyles },
  { rel: "stylesheet", href: w3Styles },
];

export const loader: LoaderFunction = async ({ request, params }) => {
  const slug = params.code;
  const game = await db.game.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!game) throw new Error("Game not found");

  const movie = await db.movie.findUnique({
    where: { id: params.movieId },
  });
  if (!movie) throw new Error("Movie not found");

  const movieList = {
    movies: await db.movieScore.findMany({
      where: { game },
      select: { id: true, position: true },
      orderBy: {
        position: "asc",
      },
    }),
  };

  const currMoviePosition = await db.movieScore.findMany({
    where: {
      game: { id: game.id },
      AND: [
        {
          movie: { id: params.movieId },
        },
      ],
    },
  });

  console.table(movieList.movies);
  console.log("Total number of movies:");
  const totalMoviesNumber = Object.keys(movieList.movies).length;
  console.log(totalMoviesNumber);
  console.log("Current movie position:");
  console.log(currMoviePosition[0].position);

  const moviesLeft = totalMoviesNumber - currMoviePosition[0].position;
  console.log(moviesLeft);
  const player = await getPlayer(request);

  return {
    movie,
    player,
    game,
    slug,
    movieList,
    currMoviePosition,
    moviesLeft,
  };
};

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const slug = params.code;
  const game = await db.game.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!game) throw new Error("Game not found");

  const currMoviePosition = await db.movieScore.findMany({
    where: {
      game: { id: game.id },
      AND: [
        {
          movie: { id: params.movieId },
        },
      ],
    },
  });

  const nextPosition = currMoviePosition[0].position;

  const data = {
    movies: await db.movie.findMany({
      select: { id: true, title: true },
    }),
  };
  if (!data) throw new Error("Game not found");

  const gameId = game.id;

  if (typeof actionType !== "string") {
    throw new Error(`No action type found in form data.`);
  }

  const user = await requireUser(request);
  if (!user) {
    return null;
  }

  switch (actionType) {
    case "yes": {
      await db.movieScore.updateMany({
        where: {
          game: { id: gameId },
          AND: [
            {
              movie: { id: params.movieId },
            },
          ],
        },
        data: {
          likes: { increment: 1 },
        },
      });

      const nextMovie = data.movies[nextPosition];
      //const nextMovie = currMoviePosition[0].position;
      if (nextMovie === undefined) {
        //if (nextPosition < 0) {
        throw redirect(`/game/${slug}/spinner`);
      } else {
        throw redirect(`/game/${slug}/${data.movies[nextPosition].id}`);
      }
    }
    case "no": {
      await db.movieScore.updateMany({
        where: {
          game: { id: gameId },
          AND: [
            {
              movie: { id: params.movieId },
            },
          ],
        },
        data: {
          likes: { increment: -1 },
        },
      });

      const nextMovie = data.movies[nextPosition];
      if (nextMovie === undefined) {
        // await db.playersInGames.update({
        //   where: { playerId },
        //   data: {
        //     hasVoted: true,
        //   },
        // });
        throw redirect(`/game/${slug}/spinner`);
      } else {
        throw redirect(`/game/${slug}/${data.movies[nextPosition].id}`);
      }
    }
    default: {
      throw json("Invalid action type.", 400);
    }
  }
};

export default function Movie() {
  const { movie, moviesLeft, slug } = useLoaderData();
  const IMG_URL = "https://image.tmdb.org/t/p/w500";
  const poster = IMG_URL + movie.posterPath;
  // const vote = useActionData();
  const navigate = useNavigate();

  //Timer countdown
  const [timer, setTimer] = useState(59);
  const id = useRef(null);
  const clear = () => {
    window.clearInterval(id.current);
  };

  useEffect(() => {
    id.current = window.setInterval(() => {
      setTimer((time) => time - 1);
    }, 1000);
    return () => clear();
  }, []);

  useEffect(() => {
    if (timer === 0) {
      clear();
      navigate(`/game/${slug}/spinner`, { replace: true });
    }
  }, [navigate, slug, timer]);

  const submit = useSubmit();

  const slideRight = () => {
    console.log("swiped right");
    submit({ actionType: "yes" }, { method: "post" });
  };

  const slideLeft = () => {
    console.log("swiped left");
    submit({ actionType: "no" }, { method: "post" });
  };

  const handlers = useSwipeable({
    onSwiped: (eventData) => console.log("User Swiped!", eventData),
    onSwipedLeft: () => slideLeft(),
    onSwipedRight: () => slideRight(),
    // preventDefaultTouchmoveEvent: true,
    // trackMouse: true,
  });

  return (
    <>
      {/* <div> You can swipe here </div> */}
      <div className="header">
        <div className="flex-grid">
          <div className="col1">
            <Link to="/lobby">
              <img src={back} alt="back button" />
            </Link>
          </div>
          <div className="col2">
            <Link to="/">
              <img src={home} alt="home button" />
            </Link>
          </div>
        </div>
        <h2>Find Your Vibe</h2>
        <p>
          Judge a flick by its cover. In this timed speed round we’ll discover
          what type of movie you feel like watching.
        </p>
      </div>

      {/* <div className="container"> */}
      <div className="movies w3-content w3-section">
        <div className="counter">0 : {timer}</div>
        <Form>
          <input type="hidden" name="actionType" />
          <img src={poster} className="poster w3-animate-zoom" {...handlers} />
        </Form>

        {/* <div>
          {vote?.errors ? <p style={{ color: "red" }}>{vote.errors}</p> : null}
        </div> */}
      </div>
      {/* </div> */}
      {movie.id && (
        <>
          <div id="footer">
            <div className="flex-grid">
              <div className="col1-footer">
                <Form method="post">
                  <input type="hidden" name="actionType" value="no" />
                  <button type="submit" className="btn glow-button">
                    <img src={dislike} alt="dislike button" />
                  </button>
                </Form>
              </div>
              <div className="col2-footer">
                <button disabled className="btn-slide-n">
                  {moviesLeft + 1}
                </button>
              </div>
              <div className="col3-footer"></div>
              <Form method="post">
                <input type="hidden" name="actionType" value="yes" />
                <button type="submit" className="btn glow-button">
                  <img src={like} alt="like button" />
                </button>
              </Form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
