const brandMark = document.querySelector(".brand-mark");
const logo = document.querySelector("#site-logo");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");
const revealItems = document.querySelectorAll(".reveal");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");

if (window.location.hash) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (logo && brandMark) {
  logo.addEventListener("load", () => {
    brandMark.classList.add("logo-ready");
  });

  logo.addEventListener("error", () => {
    brandMark.classList.remove("logo-ready");
  });

  if (logo.complete && logo.naturalWidth > 0) {
    brandMark.classList.add("logo-ready");
  }
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

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      requestType: String(formData.get("requestType") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    if (!payload.name || !payload.contact || !payload.requestType || !payload.message) {
      formStatus.textContent = "Complétez tous les champs avant transmission.";
      return;
    }

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const endpoint = contactForm.dataset.endpoint || "/api/contact";

    formStatus.textContent = "Transmission en cours...";

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
      formStatus.textContent = "Demande envoyée. La cellule BNI revient vers vous rapidement.";
    } catch (error) {
      formStatus.textContent =
        error instanceof Error
          ? error.message
          : "Impossible de transmettre la demande pour le moment.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Transmettre la demande";
      }
    }
  });
}
