const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
const revealItems = document.querySelectorAll(".reveal");
const scrollItems = document.querySelectorAll(
  ".section-head, .module, .catalog-card, .service-board article, .agent-card, .contact-form"
);
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const formStartedAt = Date.now();
const teamCarousels = document.querySelectorAll("[data-team-carousel]");

scrollItems.forEach((item, index) => {
  item.classList.add("scroll-item");
  item.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 56}ms`);

  if (item.matches(".agent-card, .contact-form")) {
    item.classList.add("reveal-scale");
  }
});

if (window.location.hash) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

teamCarousels.forEach((carousel) => {
  const track = carousel.querySelector("[data-team-track]");
  const filters = Array.from(carousel.querySelectorAll("[data-team-filter]"));
  const cards = Array.from(carousel.querySelectorAll("[data-team-category]"));
  const prevButton = carousel.querySelector("[data-team-prev]");
  const nextButton = carousel.querySelector("[data-team-next]");

  if (!track || !cards.length) {
    return;
  }

  const getVisibleCards = () => cards.filter((card) => !card.classList.contains("is-hidden"));

  const updateArrows = () => {
    const canScroll = track.scrollWidth > track.clientWidth + 2;

    if (prevButton) {
      prevButton.disabled = !canScroll || track.scrollLeft <= 2;
    }

    if (nextButton) {
      nextButton.disabled = !canScroll || track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
  };

  const moveCarousel = (direction) => {
    const visibleCards = getVisibleCards();
    const cardWidth = visibleCards[0] ? visibleCards[0].getBoundingClientRect().width : track.clientWidth;

    track.scrollBy({
      left: direction * (cardWidth + 14),
      behavior: "smooth",
    });
  };

  filters.forEach((filterButton) => {
    filterButton.addEventListener("click", () => {
      const filter = filterButton.dataset.teamFilter || "all";

      filters.forEach((button) => {
        const isActive = button === filterButton;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });

      cards.forEach((card) => {
        const isVisible = filter === "all" || card.dataset.teamCategory === filter;
        card.classList.toggle("is-hidden", !isVisible);
      });

      track.scrollTo({ left: 0, behavior: "smooth" });
      window.setTimeout(updateArrows, 180);
    });
  });

  if (prevButton) {
    prevButton.addEventListener("click", () => moveCarousel(-1));
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => moveCarousel(1));
  }

  track.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  updateArrows();
});

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

// Scroll reveal composant par composant : titres, cartes et formulaire.
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
