const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
const revealItems = document.querySelectorAll(".reveal");
const motionArea = document.querySelector("[data-motion-area]");
const motionCards = document.querySelectorAll(".module, .catalog-card, .service-board article, .network-step");
const introOverlay = document.querySelector(".intro-overlay");
const scrollItems = document.querySelectorAll(
  ".section-head, .module, .network-map, .network-step, .catalog-card, .service-board article, .agent-card, .contact-form"
);
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const formStartedAt = Date.now();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Intro courte : l'overlay initialise l'univers visuel puis libere vite l'interface.
const finishIntro = () => {
  document.documentElement.classList.add("intro-complete", "intro-done");

  window.setTimeout(() => {
    document.documentElement.classList.remove("intro-active");

    if (introOverlay) {
      introOverlay.remove();
    }
  }, prefersReducedMotion ? 0 : 460);
};

if (introOverlay) {
  if (prefersReducedMotion) {
    finishIntro();
  } else {
    window.setTimeout(finishIntro, 1180);
  }
} else {
  document.documentElement.classList.remove("intro-active");
}

scrollItems.forEach((item, index) => {
  item.classList.add("scroll-item");
  item.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 56}ms`);

  if (item.matches(".network-map, .agent-card, .contact-form")) {
    item.classList.add("reveal-scale");
  }

  if (item.matches(".network-step")) {
    item.classList.add("reveal-side");
  }
});

if (window.location.hash) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if (siteNav) {
  const navLinks = Array.from(siteNav.querySelectorAll('a[href^="#"]'));
  const navTargets = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navTargets.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!activeEntry) {
          return;
        }

        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${activeEntry.target.id}`;
          link.classList.toggle("is-active", isActive);

          if (isActive) {
            link.setAttribute("aria-current", "page");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      },
      {
        threshold: [0.28, 0.52],
        rootMargin: "-20% 0px -55% 0px",
      }
    );

    navTargets.forEach((target) => navObserver.observe(target));
  }
}

if (motionArea && !prefersReducedMotion) {
  motionArea.addEventListener("pointermove", (event) => {
    const rect = motionArea.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    motionArea.style.setProperty("--motion-x", `${Math.max(0, Math.min(100, x))}%`);
    motionArea.style.setProperty("--motion-y", `${Math.max(0, Math.min(100, y))}%`);
  });

  motionArea.addEventListener("pointerleave", () => {
    motionArea.style.setProperty("--motion-x", "50%");
    motionArea.style.setProperty("--motion-y", "50%");
  });
}

if (!prefersReducedMotion) {
  motionCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      card.style.setProperty("--tilt-x", `${x * 4}deg`);
      card.style.setProperty("--tilt-y", `${y * -4}deg`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

// Scroll reveal composant par composant : titres, cartes, carte reseau et formulaire.
if ("IntersectionObserver" in window) {
  const itemObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          itemObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -56px 0px",
    }
  );

  scrollItems.forEach((item) => itemObserver.observe(item));
} else {
  scrollItems.forEach((item) => item.classList.add("is-visible"));
}

if (contactForm && formStatus) {
  const setFormStatus = (message, state = "") => {
    formStatus.textContent = message;

    if (state) {
      formStatus.dataset.state = state;
    } else {
      delete formStatus.dataset.state;
    }
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      requestType: String(formData.get("requestType") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      elapsedMs: Date.now() - formStartedAt,
    };

    if (!payload.name || !payload.contact || !payload.requestType || !payload.message) {
      setFormStatus("Complétez tous les champs avant transmission.", "error");
      return;
    }

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const submitButtonText = submitButton ? submitButton.textContent : "";
    const endpoint = contactForm.dataset.endpoint || "/api/contact";

    setFormStatus("Transmission en cours...", "sending");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Transmission...";
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Échec lors de l'envoi.");
      }

      contactForm.reset();
      setFormStatus("Demande envoyée. La cellule BNI revient vers vous rapidement.", "success");
    } catch (error) {
      setFormStatus(
        error instanceof Error
          ? error.message
          : "Impossible de transmettre la demande pour le moment.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButtonText || "Transmettre";
      }
    }
  });
}
