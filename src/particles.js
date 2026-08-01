export function createParticleLayer(canvas) {
  if (!canvas || typeof canvas.getContext !== "function") {
    return { burst() {}, clear() {}, destroy() {} };
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return { burst() {}, clear() {}, destroy() {} };
  }

  const particles = [];
  let animationFrame = null;
  let isRunning = false;
  let isDestroyed = false;

  function resize() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * pixelRatio);
    canvas.height = Math.floor(window.innerHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function stopAnimation() {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    isRunning = false;
    canvas.classList.remove("particle-canvas--active");
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function burst() {
    if (isDestroyed) {
      return;
    }

    particles.length = 0;
    canvas.classList.add("particle-canvas--active");

    const originX = window.innerWidth / 2;
    const originY = window.innerHeight * 0.42;

    for (let index = 0; index < 90; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;

      particles.push({
        x: originX,
        y: originY,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: 1,
        decay: 0.009 + Math.random() * 0.009,
        size: 1 + Math.random() * 2.5,
        hue: 185 + Math.random() * 100,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.72 ? "square" : "circle",
      });
    }

    if (!isRunning) {
      isRunning = true;
      animationFrame = window.requestAnimationFrame(render);
    }
  }

  function clear() {
    particles.length = 0;
    stopAnimation();
  }

  function render() {
    if (isDestroyed || !isRunning) {
      return;
    }

    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.save();
    context.globalCompositeOperation = "lighter";

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.velocityY += 0.045;
      particle.rotation += particle.rotationSpeed;
      particle.life -= particle.decay;

      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }

      context.fillStyle = `hsla(${particle.hue}, 90%, 75%, ${particle.life})`;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);

      if (particle.shape === "square") {
        context.fillRect(-particle.size, -particle.size, particle.size * 2, particle.size * 2);
      } else {
        context.beginPath();
        context.arc(0, 0, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
    }

    context.restore();

    if (particles.length === 0) {
      stopAnimation();
      return;
    }

    animationFrame = window.requestAnimationFrame(render);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  return {
    burst,
    clear,
    destroy() {
      isDestroyed = true;
      clear();
      window.removeEventListener("resize", resize);
    },
  };
}
