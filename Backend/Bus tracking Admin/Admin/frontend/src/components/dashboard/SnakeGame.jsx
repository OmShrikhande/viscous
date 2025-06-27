import React, { useState, useEffect, useRef } from 'react';

const GRID_SIZE = 7;
const CELL_SIZE = 20; // px
const INITIAL_SNAKE = [{ x: 3, y: 3 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };

function getRandomFood(snake) {
  let foodPosition;
  do {
    foodPosition = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === foodPosition.x && seg.y === foodPosition.y));
  return foodPosition;
}

const SnakeGame = () => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState(getRandomFood(INITIAL_SNAKE));
  const [gameOver, setGameOver] = useState(false);
  const moveRef = useRef(direction);

  useEffect(() => {
    moveRef.current = direction;
  }, [direction]);

  useEffect(() => {
    if (gameOver) return;
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          if (moveRef.current.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (moveRef.current.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (moveRef.current.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (moveRef.current.x !== -1) setDirection({ x: 1, y: 0 });
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setSnake(prev => {
        const newHead = {
          x: (prev[0].x + direction.x + GRID_SIZE) % GRID_SIZE,
          y: (prev[0].y + direction.y + GRID_SIZE) % GRID_SIZE,
        };
        // Check collision with self
        if (prev.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          setGameOver(true);
          return prev;
        }
        let newSnake;
        if (newHead.x === food.x && newHead.y === food.y) {
          newSnake = [newHead, ...prev];
          setFood(getRandomFood(newSnake));
        } else {
          newSnake = [newHead, ...prev.slice(0, -1)];
        }
        return newSnake;
      });
    }, 170);
    return () => clearInterval(interval);
  }, [direction, food, gameOver]);

  const handleRestart = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(getRandomFood(INITIAL_SNAKE));
    setGameOver(false);
  };

  return (
    <div className="rounded-xl p-4 shadow-lg bg-white/30 backdrop-blur border border-white/30 flex flex-col items-center" style={{ minHeight: 220 }}>
      <h3 className="text-base font-semibold text-gray-900 mb-2">Snake Game</h3>
      <div className="mb-1 text-sm text-gray-700 font-medium">
        Score: {snake.length - 1}
      </div>
      <div
        className="grid gap-0.5 mb-2"
        style={{
          gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}
      >
        {[...Array(GRID_SIZE * GRID_SIZE)].map((_, idx) => {
          const x = idx % GRID_SIZE;
          const y = Math.floor(idx / GRID_SIZE);
          const isSnake = snake.some(seg => seg.x === x && seg.y === y);
          const isFood = food.x === x && food.y === y;
          return (
            <div
              key={idx}
              className={`w-5 h-5 rounded ${isSnake ? 'bg-green-600' : isFood ? 'bg-red-500' : 'bg-white/50'}`}
              style={{
                border: isSnake || isFood ? '2px solid #333' : '1px solid #e5e7eb'
              }}
            />
          );
        })}
      </div>
      {gameOver && (
        <div className="text-center mb-1">
          <p className="text-red-600 font-bold text-xs">Game Over!</p>
          <button
            onClick={handleRestart}
            className="mt-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Restart
          </button>
        </div>
      )}
      <p className="text-xs text-gray-500">Use arrow keys to play</p>
    </div>
  );
};

export default SnakeGame;