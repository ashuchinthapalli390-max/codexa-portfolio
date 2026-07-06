import { useState, useCallback, useRef } from "react";

export function useTilt(maxRotation = 10) {
  const [tiltStyle, setTiltStyle] = useState({});
  const cardRef = useRef<HTMLElement | null>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Mouse coords relative to card center
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;
    
    // Normalized values (-0.5 to 0.5)
    const normX = x / width;
    const normY = y / height;
    
    // Rotation values: move mouse right => tilt left-to-right (rotY positive), move mouse up => tilt top-to-bottom (rotX positive)
    const rotateX = -normY * maxRotation;
    const rotateY = normX * maxRotation;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: "transform 0.1s ease-out"
    });
  }, [maxRotation]);

  const onMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s ease"
    });
  }, []);

  return {
    cardRef,
    tiltStyle,
    onMouseMove,
    onMouseLeave
  };
}
