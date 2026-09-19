// animation.js
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', function() {
  
  // Fade In
  gsap.from('.fade-in', {
    opacity: 0,
    duration: 1.5,
    stagger: 0.1
  });

  // Slide Left
  gsap.from('.slide-left', {
    x: -100,
    opacity: 0,
    duration: 1.5,
    stagger: 0.1
  });

  // Slide Right
  gsap.from('.slide-right', {
    x: 100,
    opacity: 0,
    duration: 1.5,
    stagger: 0.1
  });

  // Scale In
  gsap.from('.scale-in', {
    scale: 0,
    opacity: 0,
    duration: 1.5,
    stagger: 0.1
  });

  // Scroll Fade
  document.querySelectorAll('.scroll-fade').forEach(element => {
    gsap.from(element, {
      opacity: 0,
      y: 50,
      duration: 1.5,
      scrollTrigger: {
        trigger: element,
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });
  });

  // Hover Scale
  document.querySelectorAll('.hover-scale').forEach(element => {
    element.addEventListener('mouseenter', () => {
      gsap.to(element, { scale: 1.1, duration: 0.3 });
    });
    element.addEventListener('mouseleave', () => {
      gsap.to(element, { scale: 1, duration: 0.3 });
    });
  });
});


// Custom Cursor
const cursor = document.createElement("div");
cursor.classList.add("custom-cursor");
document.body.appendChild(cursor);

document.addEventListener("mousemove", (e) => {
  gsap.to(cursor, {
    x: e.clientX,
    y: e.clientY,
    duration: 0.2,
    ease: "power2.out"
  });
});

// Cursor hover effect
document.querySelectorAll("a, button, input, textarea").forEach(element => {

  element.addEventListener("mouseenter", () => {
    gsap.to(cursor, {
      scale: 1.8,
      duration: 0.3
    });
  });

  element.addEventListener("mouseleave", () => {
    gsap.to(cursor, {
      scale: 1,
      duration: 0.3
    });
  });

});



// ==========================
// BOOK OPEN / CLOSE
// ==========================

document.addEventListener("click", function (e) {

  const book = e.target.closest(".book");

  if (!book) return;

  // View Details / Delete button par book close/open na ho
  if (e.target.closest("button")) return;

  const cover = book.querySelector(".cover");

  if (!cover) return;

  const isOpen = book.classList.contains("book-open");

  if (!isOpen) {

    // OPEN
    gsap.to(cover, {
      rotateY: -80,
      duration: 0.8,
      ease: "power2.inOut"
    });

    book.classList.add("book-open");

  } else {

    // CLOSE
    gsap.to(cover, {
      rotateY: 0,
      duration: 0.8,
      ease: "power2.inOut"
    });

    book.classList.remove("book-open");

  }

});



