const preventScroll = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Stops propagation to parent elements
  };

let totalCredits = 0; // Total credits (positive or negative)
let cumulativeAngle = 0; // Tracks the knob's total rotation angle
const knob = document.getElementById("knob");
const voteDisplay = document.getElementById("vote-count");
const creditDisplay = document.getElementById("credit-count");
const mainCircles = document.querySelectorAll(".circle"); // Main concentric circles
const knobContainer = document.getElementById("knob-container"); // For intermediate circles
let isDragging = false; // Tracks if the knob is being interacted with

// Utility: Calculate votes, credits, and progress
const calculateProgress = (credits) => {
  const absCredits = Math.abs(credits);
  const votes = Math.floor(Math.sqrt(absCredits)); // Votes = sqrt(credits)
  const creditsForCurrentVote = votes ** 2;
  const creditsForNextVote = (votes + 1) ** 2;
  const progress = absCredits - creditsForCurrentVote;
  const maxProgress = creditsForNextVote - creditsForCurrentVote;

  return { votes, creditsForCurrentVote, progress, maxProgress };
};

// Dynamically update intermediate circles
const updateIntermediateCircles = (progress, maxProgress, currentVote, isNegative) => {
    const intermediateCircles = document.querySelectorAll(".intermediate-circle");
    intermediateCircles.forEach((circle) => circle.remove());
  
    const divisions = maxProgress;
    const fillCount = Math.floor((progress / divisions) * divisions);
    const baseSize = currentVote === 1 ? 20 : currentVote === 2 ? 40 : currentVote === 3 ? 60 : 80; // Match sizes to vw
    const stepSize = 20; // Dynamically adjust for screen size
  
    for (let i = 1; i <= fillCount; i++) {
      const size = baseSize + (stepSize * i) / divisions;
      const circle = document.createElement("div");
      circle.classList.add("intermediate-circle");
      circle.style.width = `${size}vw`;
      circle.style.height = `${size}vw`;
      circle.style.background = isNegative
        ? `rgba(255, 0, 0, ${0.3 + (0.5 * i) / divisions})`
        : `rgba(0, 128, 0, ${0.3 + (0.5 * i) / divisions})`;
      knobContainer.appendChild(circle);
    }
  };        

  

// Update the UI
const updateUI = (votes, credits, progress, maxProgress, isNegative) => {
    voteDisplay.textContent = Math.abs(votes); // Always show absolute value for votes
    creditDisplay.textContent = Math.abs(credits); // Show absolute value for credits
  
    // Update direction indicator
    const directionIndicator = document.getElementById("direction-indicator");
    if (isNegative) {
      directionIndicator.textContent = "OPPOSED";
      directionIndicator.style.color = "red"; // Red for opposition
    } else {
      directionIndicator.textContent = "IN FAVOR";
      directionIndicator.style.color = "green"; // Green for in favor
    }
  
    mainCircles.forEach((circle, index) => {
      const currentVote = index + 1;
  
      if (currentVote < votes) {
        circle.style.background = isNegative
          ? "rgba(255, 0, 0, 0.8)" // Red for opposition
          : "rgba(0, 128, 0, 0.8)"; // Green for in favor
      } else if (currentVote === votes) {
        circle.style.background = isNegative
          ? "rgba(255, 0, 0, 0.8)"
          : "rgba(0, 128, 0, 0.8)";
        updateIntermediateCircles(progress, maxProgress, currentVote, isNegative);
      } else {
        circle.style.background = "rgba(0, 128, 0, 0)";
      }
    });
  
    // Rotate the knob
    knob.style.transform = `translate(-50%, -50%) rotate(${cumulativeAngle}deg)`;
  };
  


// Rollback logic
const rollbackToCheckpoint = () => {
  const absCredits = Math.abs(totalCredits);
  const nearestCheckpoint =
    totalCredits < 0
      ? -(Math.floor(Math.sqrt(absCredits)) ** 2)
      : Math.floor(Math.sqrt(absCredits)) ** 2;

  const rollbackInterval = setInterval(() => {
    if (totalCredits === nearestCheckpoint) {
      clearInterval(rollbackInterval);
      return;
    }

    totalCredits += totalCredits > nearestCheckpoint ? -1 : 1;
    cumulativeAngle += totalCredits > nearestCheckpoint ? -22.5 : 22.5;

    const isNegative = totalCredits < 0;
    const absCredits = Math.abs(totalCredits);
    const { votes, creditsForCurrentVote, progress, maxProgress } = calculateProgress(absCredits);
    updateUI(votes, totalCredits, progress, maxProgress, isNegative);
  }, 20);
};

// Knob interaction handlers
const startInteraction = (x, y) => {
    isDragging = true;
    document.body.style.overflow = "hidden"; // Completely disable scrolling
    const knobRect = knob.getBoundingClientRect();
    const centerX = knobRect.left + knobRect.width / 2;
    const centerY = knobRect.top + knobRect.height / 2;
    
    const getAngle = (x, y) => Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
  
    let initialAngle = getAngle(x, y);
  
    const moveInteraction = (moveX, moveY) => {
      if (!isDragging) return;
  
      const currentAngle = getAngle(moveX, moveY);
      let deltaAngle = currentAngle - initialAngle;
  
      if (deltaAngle > 180) deltaAngle -= 360;
      else if (deltaAngle < -180) deltaAngle += 360;
  
      if ((totalCredits >= 16 && deltaAngle > 0) || (totalCredits <= -16 && deltaAngle < 0)) {
        initialAngle = currentAngle;
        return;
      }
  
      cumulativeAngle += deltaAngle;
      initialAngle = currentAngle;
  
      if (cumulativeAngle >= 360) {
        totalCredits += 1;
        cumulativeAngle -= 360;
      } else if (cumulativeAngle <= -360) {
        totalCredits -= 1;
        cumulativeAngle += 360;
      }
  
      const isNegative = totalCredits < 0;
      const absCredits = Math.abs(totalCredits);
      const { votes, creditsForCurrentVote, progress, maxProgress } = calculateProgress(absCredits);
      updateUI(votes, totalCredits, progress, maxProgress, isNegative);
    };
  
    const endInteraction = () => {
      isDragging = false;
      rollbackToCheckpoint();
      document.body.style.overflow = ""; // Re-enable scrolling
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  
    const onMouseMove = (event) => moveInteraction(event.clientX, event.clientY);
    const onMouseUp = () => endInteraction();
    const onTouchMove = (event) => {
      moveInteraction(event.touches[0].clientX, event.touches[0].clientY);
      preventScroll(event); // Prevent scroll during touch drag
    };
    const onTouchEnd = () => endInteraction();
  
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false }); // Ensure scroll prevention
    document.addEventListener("touchend", onTouchEnd);
  };
  

// Event Listeners
knob.addEventListener("mousedown", (e) => startInteraction(e.clientX, e.clientY));
knob.addEventListener("touchstart", (e) => startInteraction(e.touches[0].clientX, e.touches[0].clientY));

const dropdownContainer = document.getElementById("dropdown-container");
const dropdownHeader = document.getElementById("dropdown-header");

dropdownHeader.addEventListener("click", () => {
  dropdownContainer.classList.toggle("expanded");
});
