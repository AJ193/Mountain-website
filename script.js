import imagesLoaded from "https://esm.sh/imagesloaded";

console.clear();

// -------------------------------------------------
// ------------------ Utilities --------------------
// -------------------------------------------------

// Math utilities
const wrap = (n, max) => (n + max) % max;
const lerp = (a, b, t) => a + (b - a) * t;

// DOM utilities
const isHTMLElement = (el) => el instanceof HTMLElement;

const genId = (() => {
  let count = 0;
  return () => {
    return (count++).toString();
  };
})();

class Raf {
  constructor() {
    this.rafId = 0;
    this.raf = this.raf.bind(this);
    this.callbacks = [];

    this.start();
  }

  start() {
    this.raf();
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }

  raf() {
    this.callbacks.forEach(({ callback, id }) => callback({ id }));
    this.rafId = requestAnimationFrame(this.raf);
  }

  add(callback, id) {
    this.callbacks.push({ callback, id: id || genId() });
  }

  remove(id) {
    this.callbacks = this.callbacks.filter((callback) => callback.id !== id);
  }
}

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
  }

  lerp(v, t) {
    this.x = lerp(this.x, v.x, t);
    this.y = lerp(this.y, v.y, t);
  }
}

const vec2 = (x = 0, y = 0) => new Vec2(x, y);

export function tilt(node, options) {
  let { trigger, target } = resolveOptions(node, options);

  let lerpAmount = 0.06;

  const rotDeg = { current: vec2(), target: vec2() };
  const bgPos = { current: vec2(), target: vec2() };

  const update = (newOptions) => {
    destroy();
    ({ trigger, target } = resolveOptions(node, newOptions));
    init();
  };

  let rafId;

  function ticker({ id }) {
    rafId = id;

    rotDeg.current.lerp(rotDeg.target, lerpAmount);
    bgPos.current.lerp(bgPos.target, lerpAmount);

    for (const el of target) {
      el.style.setProperty("--rotX", rotDeg.current.y.toFixed(2) + "deg");
      el.style.setProperty("--rotY", rotDeg.current.x.toFixed(2) + "deg");

      el.style.setProperty("--bgPosX", bgPos.current.x.toFixed(2) + "%");
      el.style.setProperty("--bgPosY", bgPos.current.y.toFixed(2) + "%");
    }
  }

  const onMouseMove = ({ offsetX, offsetY }) => {
    lerpAmount = 0.1;

    for (const el of target) {
      const ox = (offsetX - el.clientWidth * 0.5) / (Math.PI * 3);
      const oy = -(offsetY - el.clientHeight * 0.5) / (Math.PI * 4);

      rotDeg.target.set(ox, oy);
      bgPos.target.set(-ox * 0.3, oy * 0.3);
    }
  };

  const onMouseLeave = () => {
    lerpAmount = 0.06;

    rotDeg.target.set(0, 0);
    bgPos.target.set(0, 0);
  };

  const addListeners = () => {
    trigger.addEventListener("mousemove", onMouseMove);
    trigger.addEventListener("mouseleave", onMouseLeave);
  };

  const removeListeners = () => {
    trigger.removeEventListener("mousemove", onMouseMove);
    trigger.removeEventListener("mouseleave", onMouseLeave);
  };

  const init = () => {
    addListeners();
    raf.add(ticker);
  };

  const destroy = () => {
    removeListeners();
    raf.remove(rafId);
  };

  init();

  return { destroy, update };
}

function resolveOptions(node, options) {
  return {
    trigger: options?.trigger ?? node,
    target: options?.target
      ? Array.isArray(options.target)
        ? options.target
        : [options.target]
      : [node]
  };
}

// -----------------------------------------------------

// Global Raf Instance
const raf = new Raf();

function init() {
  const loader = document.querySelector(".loader");

  const slides = [...document.querySelectorAll(".slide")];
  const slidesInfo = [...document.querySelectorAll(".slide-info")];

  const buttons = {
    prev: document.querySelector(".slider--btn__prev"),
    next: document.querySelector(".slider--btn__next")
  };

  loader.style.opacity = 0;
  loader.style.pointerEvents = "none";

  slides.forEach((slide, i) => {
    const slideInner = slide.querySelector(".slide__inner");
    const slideInfoInner = slidesInfo[i].querySelector(".slide-info__inner");

    tilt(slide, { target: [slideInner, slideInfoInner] });
  });

  buttons.prev.addEventListener("click", change(-1));
  buttons.next.addEventListener("click", change(1));
}

function setup() {
    const loaderText = document.querySelector(".loader__text");

    const images = [...document.querySelectorAll("img")];
    const totalImages = images.length;
    let loadedImages = 0;
    let progress = {
        current: 0,
        target: 0
    };

    // update progress target
    images.forEach((image) => {
        imagesLoaded(image, (instance) => {
            if (instance.isComplete) {
                loadedImages++;
                progress.target = loadedImages / totalImages;
            }
        });
    });

    // lerp progress current to progress target
    raf.add(({ id }) => {
        progress.current = lerp(progress.current, progress.target, 0.06);

        const progressPercent = Math.round(progress.current * 100);
        loaderText.textContent = `${progressPercent}%`;

        // hide loader when progress is 100%
        if (progressPercent === 100) {
            init();

            // remove raf callback when progress is 100%
            raf.remove(id);
        }
  });
}

function change(direction) {
  return () => {
    let current = {
      slide: document.querySelector(".slide[data-current]"),
      slideInfo: document.querySelector(".slide-info[data-current]"),
      slideBg: document.querySelector(".slide__bg[data-current]")
    };
    let previous = {
      slide: document.querySelector(".slide[data-previous]"),
      slideInfo: document.querySelector(".slide-info[data-previous]"),
      slideBg: document.querySelector(".slide__bg[data-previous]")
    };
    let next = {
      slide: document.querySelector(".slide[data-next]"),
      slideInfo: document.querySelector(".slide-info[data-next]"),
      slideBg: document.querySelector(".slide__bg[data-next]")
    };

    Object.values(current).map((el) => el.removeAttribute("data-current"));
    Object.values(previous).map((el) => el.removeAttribute("data-previous"));
    Object.values(next).map((el) => el.removeAttribute("data-next"));

    if (direction === 1) {
      let temp = current;
      current = next;
      next = previous;
      previous = temp;

      current.slide.style.zIndex = "20";
      previous.slide.style.zIndex = "30";
      next.slide.style.zIndex = "10";
    } else if (direction === -1) {
      let temp = current;
      current = previous;
      previous = next;
      next = temp;

      current.slide.style.zIndex = "20";
      previous.slide.style.zIndex = "10";
      next.slide.style.zIndex = "30";
    }

    Object.values(current).map((el) => el.setAttribute("data-current", ""));
    Object.values(previous).map((el) => el.setAttribute("data-previous", ""));
    Object.values(next).map((el) => el.setAttribute("data-next", ""));
  };
}


// Start
setup();

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const tabbar = new TabBar("nav");
});

class TabBar {
    constructor(el) {
        this.el = document.querySelector(el);
        this.el?.setAttribute("data-pristine", "true");
        this.el?.addEventListener("click", this.switchTab.bind(this));
    }

    switchTab(e) {
        // Your switchTab logic here
        var _a, _b;
        // allow animations, which were prevented on load
        (_a = this.el) === null || _a === void 0 ? void 0 : _a.removeAttribute("data-pristine");
        const target = e.target;
        const href = target.getAttribute("href");
        // target should be a link before assigning the “current” state
        if (href) {
            // remove the state from the current page…
            const currentPage = (_b = this.el) === null || _b === void 0 ? void 0 : _b.querySelector(`[aria-current="page"]`);
            if (currentPage) {
                currentPage.ariaCurrent = null;
            }
            // …and apply it to the next
            target.ariaCurrent = "page";
    }
  }
}

class Slider {
  constructor(selector) {
      this.slider = document.querySelector(selector);
      this.slides = this.slider.querySelectorAll(".slide");
      this.currentSlideIndex = 0;
      this.startAutoPlay();
  }

  startAutoPlay() {
      this.interval = setInterval(() => {
          this.showNextSlide();
      }, 5000); // Change slide every 5 seconds (5000 milliseconds)
  }

  stopAutoPlay() {
      clearInterval(this.interval);
  }

  showNextSlide() {
      this.slides[this.currentSlideIndex].classList.remove("data-current");
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
      this.slides[this.currentSlideIndex].classList.add("data-current");
  }

  showPrevSlide() {
      this.slides[this.currentSlideIndex].classList.remove("data-current");

      this.currentSlideIndex = (this.currentSlideIndex - 1 + this.slides.length) % this.slides.length;

      this.slides[this.currentSlideIndex].classList.add("data-current");
  }
}

const slider = new Slider(".slider");
// Get all modals
var modals = document.querySelectorAll('.modal');

// Loop through each modal
modals.forEach(function(modal, index) {
  // Get the image and insert it inside the modal - use its "alt" text as a caption
  var images = document.querySelectorAll('.myImg');
  var modalImg = modal.querySelector('.modal-content');
  var captionText = modal.querySelector('.caption');

  images[index].onclick = function(){
    modal.style.display = "block";
    modalImg.src = this.src;
    captionText.innerHTML = this.alt;
  }

  // Get the <span> element that closes the modal
  var spans = modal.querySelectorAll('.close');

  // Loop through each close button for this modal
  spans.forEach(function(span) {
    span.onclick = function() { 
      modal.style.display = "none";
    }
  });
});



document.addEventListener("DOMContentLoaded", function() {
  // Get all image containers
  const imageContainers = document.querySelectorAll(".dragging");

  // Get previous and next buttons
  const prevBtn = document.querySelector(".prev-btn");
  const nextBtn = document.querySelector(".next-btn");

  // Set initial index
  let currentIndex = 0;

  // Determine the maximum number of images to display based on device type
  const maxImagesPC = 6; // Maximum number of images to display on PC
  const maxImagesMobile = 1; // Maximum number of images to display on mobile

  // Initially hide buttons if there are fewer images than the maximum
  if (window.innerWidth >= 768 && imageContainers.length <= maxImagesPC) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  } else if (window.innerWidth < 768 && imageContainers.length <= maxImagesMobile) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  }

  // Add event listeners to the buttons
  prevBtn.addEventListener("click", showPrevImage);
  nextBtn.addEventListener("click", showNextImage);

  function showPrevImage() {
    if (currentIndex > 0) {
      currentIndex--;
      slideImages();
    }
  }

  function showNextImage() {
    if (currentIndex < imageContainers.length - 1) {
      currentIndex++;
      slideImages();
    }
  }

  function slideImages() {
    const offset = -currentIndex * 300; // Assuming each image has a width of 300px
    imageContainers.forEach(function(container) {
      container.style.transform = `translateX(${offset}px)`;
    });
  }

  // Event listener to update navigation buttons on window resize
  window.addEventListener("resize", function() {
    if (window.innerWidth >= 768 && imageContainers.length > maxImagesPC) {
      prevBtn.style.display = "block";
      nextBtn.style.display = "block";
    } else if (window.innerWidth < 768 && imageContainers.length > maxImagesMobile) {
      prevBtn.style.display = "block";
      nextBtn.style.display = "block";
    } else {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
    }
  });
});

