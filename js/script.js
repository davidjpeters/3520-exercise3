$(document).ready(function() {
    const container = $('#container');
    let balls = [];
    let ballCount = 0;
    let speedMultiplier = 1.0;
    let audioContext;
    let masterGainNode;
    
    // Piano notes frequencies (C4 major scale)
    const notes = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        349.23, // F4
        392.00, // G4
        440.00, // A4
        493.88, // B4
        523.25  // C5
    ];

    function initializeAudio() {
        // Use AudioContext initialization method specific to Safari
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a silent buffer to unlock audio
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        
        // Play the silent buffer
        source.start(0);

        // Create master gain node
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        masterGainNode.connect(audioContext.destination);
    }

    function playNote(frequency) {
        // Ensure audio context exists and is not suspended
        if (!audioContext || audioContext.state === 'suspended') {
            try {
                initializeAudio();
            } catch (error) {
                console.error('Could not initialize audio:', error);
                return;
            }
        }

        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

            // Soft attack and quick decay
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(masterGainNode);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.error('Error playing note:', error);
        }
    }

    // Attempt to unlock audio on first interaction
    function unlockAudio() {
        if (!audioContext) {
            try {
                initializeAudio();
            } catch (error) {
                console.error('Could not unlock audio:', error);
            }
        }
        
        // Remove this listener after first use
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('click', unlockAudio);
    }

    // Add multiple event listeners to attempt audio unlocking
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('click', unlockAudio);

    // Ball class with getRandomColor method EXPLICITLY DEFINED
    class Ball {
        constructor() {
            this.id = 'ball-' + ballCount++;
            this.noteIndex = ballCount % notes.length;
            
            // Method to generate random color
            this.getRandomColor = () => {
                const hue = Math.floor(Math.random() * 360);
                const saturation = Math.floor(Math.random() * 30) + 70;
                const lightness = Math.floor(Math.random() * 30) + 40;
                return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            };
            
            this.element = $('<div>')
                .addClass('ball')
                .attr('id', this.id)
                .css({
                    backgroundColor: this.getRandomColor(),
                    top: '140px',
                    left: '140px'
                });
            
            container.append(this.element);
            
            this.x = 140;
            this.y = 140;
            this.dx = (Math.random() - 0.5) * 15;
            this.dy = (Math.random() - 0.5) * 15;
            this.baseGravity = 0.15;
            this.baseFriction = 0.995;
            this.lastCollisionTime = 0;
        }

        update() {
            this.x += this.dx * speedMultiplier;
            this.y += this.dy * speedMultiplier;

            this.dy += this.baseGravity * speedMultiplier;
            
            const adjustedFriction = 1 - ((1 - this.baseFriction) / speedMultiplier);
            this.dx *= adjustedFriction;
            this.dy *= adjustedFriction;

            const containerWidth = container.width();
            const containerHeight = container.height();
            const ballWidth = this.element.width();
            const ballHeight = this.element.height();

            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            const radius = containerWidth / 2 - ballWidth / 2;

            const distanceFromCenter = Math.sqrt(
                Math.pow(this.x + ballWidth/2 - centerX, 2) +
                Math.pow(this.y + ballHeight/2 - centerY, 2)
            );

            if (distanceFromCenter > radius) {
                // Ensure we have an audio context and enough time has passed
                if (!this.lastCollisionTime || (Date.now() - this.lastCollisionTime) > 100) {
                    playNote(notes[this.noteIndex]);
                    this.lastCollisionTime = Date.now();
                }

                const angle = Math.atan2(
                    this.y + ballHeight/2 - centerY,
                    this.x + ballWidth/2 - centerX
                );

                this.x = centerX + Math.cos(angle) * radius - ballWidth/2;
                this.y = centerY + Math.sin(angle) * radius - ballHeight/2;

                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                const dot = this.dx * normalX + this.dy * normalY;

                this.dx = this.dx - 2 * dot * normalX;
                this.dy = this.dy - 2 * dot * normalY;

                this.dx *= 0.9;
                this.dy *= 0.9;
                
                this.dx += (Math.random() - 0.5) * 0.5;
                this.dy += (Math.random() - 0.5) * 0.5;
            }

            const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
            if (speed < 0.1) {
                const angle = Math.random() * Math.PI * 2;
                this.dx += Math.cos(angle) * 0.2;
                this.dy += Math.sin(angle) * 0.2;
            }

            this.element.css({
                left: this.x + 'px',
                top: this.y + 'px'
            });
        }
    }

    // Rest of the existing game setup remains the same
    function updateSpeedDisplay() {
        $('#speedDisplay').text(speedMultiplier.toFixed(1) + 'x');
    }

    function animate() {
        balls.forEach(ball => ball.update());
        requestAnimationFrame(animate);
    }

    animate();

    $('#addBall').on('click', function() {
        for (let i = 0; i < 10; i++) {
            const ball = new Ball();
            balls.push(ball);
        }
    });

    $('#removeBall').on('click', function() {
        for (let i = 0; i < 10; i++) {
            if (balls.length > 0) {
                const ball = balls.pop();
                ball.element.remove();
            }
        }    
    });

    $('#increaseSpeed').on('click', function() {
        if (speedMultiplier < 3.0) {
            speedMultiplier += 0.1;
            updateSpeedDisplay();
        }
    });

    $('#decreaseSpeed').on('click', function() {
        if (speedMultiplier > 0.2) {
            speedMultiplier -= 0.1;
            updateSpeedDisplay();
        }
    });

    container.on('click', function(e) {
        const rect = container[0].getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        balls.forEach(ball => {
            const deltaX = clickX - (ball.x + ball.element.width()/2);
            const deltaY = clickY - (ball.y + ball.element.height()/2);

            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            ball.dx += (deltaX / length) * 20 * speedMultiplier;
            ball.dy += (deltaY / length) * 20 * speedMultiplier;
        });
    });

    $('#addBall').click();
});