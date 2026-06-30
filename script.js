(() => {
  const nav = document.querySelector(".nav-links");
  const navToggle = document.querySelector(".nav-toggle");

  const closeMobileNav = () => {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menu");
  };

  navToggle?.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  const heroVideo = document.querySelector(".hero-video");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const syncHeroPlayback = () => {
    if (!heroVideo) return;

    if (reducedMotion.matches || document.hidden) {
      heroVideo.pause();
      return;
    }

    heroVideo.play().catch(() => {});
  };

  reducedMotion.addEventListener?.("change", syncHeroPlayback);
  document.addEventListener("visibilitychange", syncHeroPlayback);
  syncHeroPlayback();

  const alignContactTitle = () => {
    const contact = document.querySelector(".contact");
    const container = document.querySelector(".contact-title");
    const lines = Array.from(document.querySelectorAll(".contact-title-line"));
    const form = document.querySelector(".contact-form");
    const copy = document.querySelector(".contact-heading-copy");

    if (!container || !form || lines.length === 0) return;

    contact?.style.setProperty("--contact-group-offset", "0px");
    copy?.style.setProperty("--contact-copy-offset", "0px");

    const containerRect = container.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const isColumn = formRect.left <= containerRect.left + 1;
    const availableWidth = isColumn ? formRect.width : formRect.left - containerRect.left * 2;
    const desktopFactor = window.matchMedia("(min-width: 881px)").matches ? 0.6 : 1;
    const targetWidth =
      Math.min(Math.max(220, availableWidth), container.parentElement.getBoundingClientRect().width) *
      desktopFactor;

    container.style.setProperty("--contact-title-target-width", `${targetWidth}px`);
    container.parentElement.style.setProperty("--contact-title-target-width", `${targetWidth}px`);

    lines.forEach((line) => {
      line.style.fontSize = "100px";
      const currentWidth = line.getBoundingClientRect().width;
      if (currentWidth > 0) {
        line.style.fontSize = `${100 * (targetWidth / currentWidth)}px`;
      }
    });

    positionContactComposition();
  };

  const positionContactComposition = () => {
    const contact = document.querySelector(".contact");
    const copy = document.querySelector(".contact-heading-copy");
    const formColumn = document.querySelector(".contact-form-column");

    if (!contact || !copy || !formColumn) return;

    if (!window.matchMedia("(min-width: 881px)").matches) {
      contact.style.removeProperty("--contact-group-offset");
      copy.style.removeProperty("--contact-copy-offset");
      return;
    }

    contact.style.setProperty("--contact-group-offset", "0px");
    copy.style.setProperty("--contact-copy-offset", "0px");

    const measuredItems = [
      copy.querySelector(".contact-title"),
      copy.querySelector(".contact-intro"),
      copy.querySelector(".contact-signature-row:not(.contact-signature-row-mobile)"),
    ].filter(Boolean);

    if (!measuredItems.length) return;

    const contentBounds = measuredItems.reduce(
      (bounds, item) => {
        const rect = item.getBoundingClientRect();
        return {
          left: Math.min(bounds.left, rect.left),
          right: Math.max(bounds.right, rect.right),
        };
      },
      { left: Infinity, right: -Infinity }
    );

    const contactRect = contact.getBoundingClientRect();
    const formRect = formColumn.getBoundingClientRect();
    const contentCenter = (contentBounds.left + contentBounds.right) / 2;
    const pageCenter = contactRect.left + contactRect.width / 2;
    const baseCopyOffset = (contactRect.left + formRect.left) / 2 - contentCenter;
    const fullSetOffsetSum = pageCenter * 2 - contentBounds.left - formRect.right;
    const groupOffset = (fullSetOffsetSum - baseCopyOffset) / 1.5;
    const copyOffset = baseCopyOffset - groupOffset / 2;

    contact.style.setProperty("--contact-group-offset", `${Math.round(groupOffset)}px`);
    copy.style.setProperty("--contact-copy-offset", `${Math.round(copyOffset)}px`);
  };

  const syncContactFormHeight = () => {
    const shell = document.querySelector("[data-contact-form-shell]");
    const signatureRow = document.querySelector(
      ".contact-signature-row:not(.contact-signature-row-mobile)"
    );

    if (!shell || !signatureRow) return;

    if (!window.matchMedia("(min-width: 881px)").matches) {
      shell.style.removeProperty("--contact-form-height");
      return;
    }

    const shellTop = shell.getBoundingClientRect().top;
    const signatureBottom = signatureRow.getBoundingClientRect().bottom;
    const targetHeight = Math.max(420, Math.round(signatureBottom - shellTop));
    shell.style.setProperty("--contact-form-height", `${targetHeight}px`);
  };

  const initProgressiveContactForm = () => {
    const form = document.querySelector("#contact-form");
    if (!form) return;

    const shell = document.querySelector("[data-contact-form-shell]");
    const successPanel = document.querySelector("[data-contact-success]");
    const steps = Array.from(form.querySelectorAll("[data-form-step]"));
    const indicators = Array.from(form.querySelectorAll("[data-step-indicator]"));
    const prevButton = form.querySelector("[data-step-prev]");
    const nextButton = form.querySelector("[data-step-next]");
    const submitButton = form.querySelector("#contact-submit");
    const status = form.querySelector("#contact-status");
    const priorityOptions = Array.from(form.querySelectorAll('input[name="prioridade"]'));
    const priorityFieldset = form.querySelector(".contact-priority");
    const configuredEndpoint = form.dataset.endpoint?.trim() || form.action;
    let currentStep = 0;

    if (!steps.length || !prevButton || !nextButton || !submitButton || !status) return;

    const setStatus = (message = "", state = "") => {
      status.textContent = message;
      status.dataset.state = state;
    };

    const stepError = (step) => step.querySelector("[data-step-error]");

    const clearStepError = (step) => {
      const error = stepError(step);
      if (error) error.textContent = "";
      step.querySelectorAll("[aria-invalid='true']").forEach((field) => {
        field.removeAttribute("aria-invalid");
      });
      priorityFieldset?.classList.remove("has-error");
    };

    const renderStep = () => {
      shell?.setAttribute("data-current-step", String(currentStep));

      steps.forEach((step, index) => {
        const active = index === currentStep;
        step.classList.toggle("is-active", active);
        step.setAttribute("aria-hidden", String(!active));
      });

      indicators.forEach((indicator, index) => {
        indicator.classList.toggle("is-active", index === currentStep);
        indicator.classList.toggle("is-complete", index < currentStep);
        indicator.setAttribute("aria-current", index === currentStep ? "step" : "false");
      });

      prevButton.classList.toggle("is-hidden", currentStep === 0);
      nextButton.classList.toggle("is-hidden", currentStep === steps.length - 1);
      submitButton.classList.toggle("is-hidden", currentStep !== steps.length - 1);
      setStatus();
      syncContactFormHeight();
    };

    const validateContactChoice = (step) => {
      const phone = step.querySelector('input[name="telefone"]');
      const email = step.querySelector('input[name="email"]');
      if (!phone || !email) return true;

      const hasPhone = phone.value.trim().length > 0;
      const hasEmail = email.value.trim().length > 0;
      if (hasPhone || hasEmail) return true;

      phone.setAttribute("aria-invalid", "true");
      email.setAttribute("aria-invalid", "true");
      const error = stepError(step);
      if (error) error.textContent = "Informe WhatsApp ou e-mail para continuar.";
      phone.focus({ preventScroll: true });
      return false;
    };

    const validateControls = (step) => {
      const controls = Array.from(step.querySelectorAll("input, select, textarea")).filter(
        (control) => control.type !== "hidden" && control.name !== "website"
      );

      for (const control of controls) {
        if (control.type === "checkbox" && control.name === "prioridade") continue;
        if ((control.name === "telefone" || control.name === "email") && !control.value.trim()) {
          continue;
        }
        if (!control.checkValidity()) {
          control.setAttribute("aria-invalid", "true");
          const error = stepError(step);
          if (error) {
            error.textContent =
              control.type === "checkbox"
                ? "Confirme esta autorização para continuar."
                : "Preencha este campo para continuar.";
          }
          control.focus({ preventScroll: true });
          return false;
        }
      }

      return validateContactChoice(step);
    };

    const validatePriority = (step) => {
      if (!step.querySelector(".contact-priority")) return true;
      const hasSelection = priorityOptions.some((option) => option.checked);
      if (hasSelection) return true;

      priorityFieldset?.classList.add("has-error");
      const error = stepError(step);
      if (error) error.textContent = "Escolha pelo menos uma necessidade para continuar.";
      priorityOptions[0]?.focus({ preventScroll: true });
      return false;
    };

    const validateStep = (index) => {
      const step = steps[index];
      if (!step) return false;
      clearStepError(step);
      return validatePriority(step) && validateControls(step);
    };

    const buildPayload = () => {
      const source = new FormData(form);
      const payload = new FormData();

      payload.set("servico", source.get("servico") || "");
      payload.set("nome", source.get("nome") || "");
      payload.set("empresa", source.get("empresa") || "");
      priorityOptions
        .filter((option) => option.checked)
        .forEach((option) => payload.append("prioridade", option.value));
      payload.set("telefone", source.get("telefone") || "");
      payload.set("email", source.get("email") || "");
      payload.set("lgpd", source.get("lgpd") || "");

      return {
        honeypot: source.get("website"),
        payload,
      };
    };

    const formatFirstName = (value) => {
      const firstName = value.trim().split(/\s+/)[0];
      if (!firstName) return "";
      const normalizedName = firstName.toLocaleLowerCase("pt-BR");
      return normalizedName.charAt(0).toLocaleUpperCase("pt-BR") + normalizedName.slice(1);
    };

    const showSuccess = () => {
      const successMessage = successPanel?.querySelector("h3");
      const firstName = formatFirstName(form.elements.nome?.value || "");

      if (successMessage) {
        successMessage.textContent = firstName
          ? `${firstName}, recebemos a sua mensagem e retornaremos com brevidade.`
          : "Recebemos a sua mensagem e retornaremos com brevidade.";
      }

      form.reset();
      shell?.classList.add("is-success");
      form.hidden = true;
      if (successPanel) successPanel.hidden = false;
    };

    prevButton.addEventListener("click", () => {
      currentStep = Math.max(0, currentStep - 1);
      renderStep();
    });

    nextButton.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      currentStep = Math.min(steps.length - 1, currentStep + 1);
      renderStep();
    });

    form.addEventListener("input", () => {
      clearStepError(steps[currentStep]);
      setStatus();
    });

    form.addEventListener("change", () => {
      clearStepError(steps[currentStep]);
      setStatus();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      for (let index = 0; index < steps.length; index += 1) {
        if (!validateStep(index)) {
          currentStep = index;
          renderStep();
          return;
        }
      }

      const { honeypot, payload } = buildPayload();
      if (honeypot) {
        showSuccess();
        return;
      }

      submitButton.disabled = true;
      prevButton.disabled = true;
      form.setAttribute("aria-busy", "true");
      setStatus("Enviando solicitação...", "loading");

      let requestTimeout;

      try {
        const controller = new AbortController();
        requestTimeout = window.setTimeout(() => controller.abort(), 15000);
        const response = await fetch(configuredEndpoint, {
          method: "POST",
          body: payload,
          mode: "no-cors",
          signal: controller.signal,
        });

        if (response.ok || response.type === "opaque") {
          showSuccess();
          return;
        }

        throw new Error("Falha no envio");
      } catch {
        setStatus("Não foi possível enviar agora. Escreva para contato@somosluc.com.br.", "error");
      } finally {
        window.clearTimeout(requestTimeout);
        submitButton.disabled = false;
        prevButton.disabled = false;
        form.removeAttribute("aria-busy");
      }
    });

    renderStep();
  };

  alignContactTitle();
  initProgressiveContactForm();
  syncContactFormHeight();
  window.addEventListener("resize", () => {
    alignContactTitle();
    positionContactComposition();
    syncContactFormHeight();
  });
  document.fonts?.ready.then(() => {
    alignContactTitle();
    positionContactComposition();
    syncContactFormHeight();
  });
})();
