import { useState, useEffect, useRef } from 'react';
import { Engine, Render, World, Bodies, Body, Runner, Events } from 'matter-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shuffle, Play, Move } from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  name: string;
  weight: number;
}

interface Ball {
  body: Body;
  name: string;
  color: string;
}

const Index = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const renderRef = useRef<Render | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  
  const [inputText, setInputText] = useState('짱구*5\n짱아*10\n맹구*3\n철수*7');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);

  // 색상 팔레트
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
    '#FD7272', '#AAB8C2', '#EE5A6F', '#FFC048'
  ];

  useEffect(() => {
    parseParticipants();
  }, [inputText]);

  const parseParticipants = () => {
    const lines = inputText.trim().split('\n').filter(line => line.trim());
    const parsed: Participant[] = [];
    
    lines.forEach(line => {
      const match = line.match(/^(.+?)\*(\d+)$/);
      if (match) {
        const name = match[1].trim();
        const weight = parseInt(match[2]);
        if (name && weight > 0) {
          parsed.push({ name, weight });
        }
      }
    });
    
    setParticipants(parsed);
  };

  const initializePhysics = () => {
    if (!canvasRef.current) return;

    // 기존 엔진 정리
    if (engineRef.current) {
      Engine.clear(engineRef.current);
    }
    if (renderRef.current) {
      Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
    }
    if (runnerRef.current) {
      Runner.stop(runnerRef.current);
    }

    const width = canvasRef.current.offsetWidth;
    const height = 600;

    // 엔진 생성
    const engine = Engine.create();
    engine.world.gravity.y = 1;
    
    // 렌더러 생성
    const render = Render.create({
      element: canvasRef.current,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: 'transparent',
        showAngleIndicator: false,
        showVelocity: false
      }
    });

    // 경계선 생성
    const walls = [
      Bodies.rectangle(width / 2, height + 30, width, 60, { 
        isStatic: true,
        render: { fillStyle: '#2D3748' }
      }),
      Bodies.rectangle(-30, height / 2, 60, height, { 
        isStatic: true,
        render: { fillStyle: '#2D3748' }
      }),
      Bodies.rectangle(width + 30, height / 2, 60, height, { 
        isStatic: true,
        render: { fillStyle: '#2D3748' }
      })
    ];

    // 선택 영역 (하단 중앙)
    const selectionArea = Bodies.rectangle(width / 2, height - 50, 200, 20, {
      isStatic: true,
      isSensor: true,
      render: { 
        fillStyle: '#FFD93D',
        strokeStyle: '#FFC107',
        lineWidth: 3
      }
    });

    World.add(engine.world, [...walls, selectionArea]);

    engineRef.current = engine;
    renderRef.current = render;
    runnerRef.current = Runner.create();

    // 충돌 감지
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        if (bodyA === selectionArea || bodyB === selectionArea) {
          const ball = bodyA === selectionArea ? bodyB : bodyA;
          const ballData = balls.find(b => b.body === ball);
          if (ballData && !winner) {
            setWinner(ballData.name);
            toast.success(`🎉 당첨자: ${ballData.name}!`);
            
            // 당첨 공 강조
            ball.render.fillStyle = '#FFD93D';
            ball.render.strokeStyle = '#FFC107';
            ball.render.lineWidth = 5;
          }
        }
      });
    });

    Render.run(render);
    Runner.run(runnerRef.current, engine);
  };

  const createBalls = () => {
    if (!engineRef.current || participants.length === 0) return;

    const width = canvasRef.current?.offsetWidth || 800;
    const newBalls: Ball[] = [];

    participants.forEach((participant, participantIndex) => {
      const color = colors[participantIndex % colors.length];
      
      for (let i = 0; i < participant.weight; i++) {
        const x = Math.random() * (width - 100) + 50;
        const y = -50 - (i * 30);
        
        const ball = Bodies.circle(x, y, 15, {
          restitution: 0.6,
          friction: 0.3,
          render: {
            fillStyle: color,
            strokeStyle: '#FFFFFF',
            lineWidth: 2
          }
        });

        newBalls.push({
          body: ball,
          name: participant.name,
          color
        });

        World.add(engineRef.current!.world, ball);
      }
    });

    setBalls(newBalls);
  };

  const handleStart = () => {
    if (participants.length === 0) {
      toast.error('참가자를 입력해주세요!');
      return;
    }

    setIsRunning(true);
    setWinner(null);
    setBalls([]);
    
    initializePhysics();
    
    setTimeout(() => {
      createBalls();
    }, 500);

    setTimeout(() => {
      setIsRunning(false);
    }, 5000);
  };

  const handleShuffle = () => {
    if (!engineRef.current || balls.length === 0) return;
    
    balls.forEach(ball => {
      const forceMagnitude = 0.02;
      Body.applyForce(ball.body, ball.body.position, {
        x: (Math.random() - 0.5) * forceMagnitude,
        y: -Math.random() * forceMagnitude
      });
    });
    
    toast.info('공들을 섞었습니다!');
  };

  const handleShake = () => {
    if (!engineRef.current || balls.length === 0) return;
    
    balls.forEach(ball => {
      Body.applyForce(ball.body, ball.body.position, {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01
      });
    });
    
    toast.info('흔들기!');
  };

  const handleReset = () => {
    if (engineRef.current) {
      Engine.clear(engineRef.current);
    }
    if (renderRef.current) {
      Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
    }
    if (runnerRef.current) {
      Runner.stop(runnerRef.current);
    }
    
    setIsRunning(false);
    setWinner(null);
    setBalls([]);
  };

  const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Marble Roulette
          </h1>
          <p className="text-gray-300 text-lg">물리 시뮬레이션 기반 추첨 게임</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 입력 패널 */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  📝 참가자 입력
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">
                    형식: 이름*가중치 (한 줄에 하나씩)
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                    placeholder="짱구*5&#10;짱아*10&#10;맹구*3"
                    disabled={isRunning}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-300">참가자 목록</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {participants.map((participant, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                        <span className="text-white">{participant.name}</span>
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-4 h-4 rounded-full border-2 border-white"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          <span className="text-gray-300">×{participant.weight}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalWeight > 0 && (
                    <p className="text-sm text-gray-400">총 공 개수: {totalWeight}개</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={handleStart}
                    disabled={isRunning || participants.length === 0}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                  <Button 
                    onClick={handleShuffle}
                    disabled={!isRunning || balls.length === 0}
                    variant="outline"
                    className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Shuffle
                  </Button>
                  <Button 
                    onClick={handleShake}
                    disabled={!isRunning || balls.length === 0}
                    variant="outline"
                    className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white"
                  >
                    <Move className="w-4 h-4 mr-2" />
                    Shake
                  </Button>
                </div>

                <Button 
                  onClick={handleReset}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Reset
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 시뮬레이션 영역 */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>🎯 추첨 시뮬레이션</span>
                  {winner && (
                    <div className="text-right">
                      <span className="text-2xl">🏆 당첨자: </span>
                      <span className="text-2xl font-bold text-yellow-400">{winner}</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  ref={canvasRef}
                  className="w-full h-[600px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border-2 border-gray-600 relative overflow-hidden"
                >
                  {!isRunning && balls.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <div className="text-6xl mb-4">🎲</div>
                        <p className="text-xl">Start 버튼을 눌러 추첨을 시작하세요!</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 선택 영역 표시 */}
                  <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full font-bold text-sm">
                    🎯 선택 영역
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
