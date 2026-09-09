/* ==========================================================================
   N.F INTERNATIONAL - JAVASCRIPT CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Header Navigation Effect
  const siteHeader = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      siteHeader?.classList.add('scrolled');
    } else {
      siteHeader?.classList.remove('scrolled');
    }
  });

  // 2. Mobile Drawer Navigation
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      hamburger.querySelector('i')?.classList.toggle('fa-bars', !isOpen);
      hamburger.querySelector('i')?.classList.toggle('fa-xmark', isOpen);
    });

    // Close menu when clicking outside or link
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.querySelector('i')?.classList.add('fa-bars');
        hamburger.querySelector('i')?.classList.remove('fa-xmark');
      }
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.querySelector('i')?.classList.add('fa-bars');
        hamburger.querySelector('i')?.classList.remove('fa-xmark');
      });
    });
  }

  // 3. Smooth Navigation & Active Section Highlight
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');
      const navItem = document.querySelector(`.nav-links a[href*=${sectionId}]`);

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navItem?.classList.add('active');
      } else {
        navItem?.classList.remove('active');
      }
    });
  });

  // 4. Job Categories Filtering System
  const filterBtns = document.querySelectorAll('.filter-btn');
  const jobCards = document.querySelectorAll('.job-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      jobCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterValue === 'all' || category === filterValue) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  // 5. Job Application Modal Dialog Controller
  const applyModal = document.getElementById('applyModal');
  const modalClose = document.querySelector('.modal-close');
  const modalJobTitleInput = document.getElementById('modalJobTitle');
  const modalForm = document.getElementById('jobApplyForm');

  function openApplyModal(jobTitle = '') {
    if (!applyModal) return;
    if (modalJobTitleInput && jobTitle) {
      modalJobTitleInput.value = jobTitle;
    } else if (modalJobTitleInput) {
      modalJobTitleInput.value = 'General Overseas Application';
    }
    applyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeApplyModal() {
    if (!applyModal) return;
    applyModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Attach event listeners to all "Apply Now" triggers
  document.querySelectorAll('.btn-apply-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.job-card');
      const jobTitle = card ? card.querySelector('.job-title')?.textContent : '';
      openApplyModal(jobTitle);
    });
  });

  modalClose?.addEventListener('click', closeApplyModal);
  applyModal?.addEventListener('click', (e) => {
    if (e.target === applyModal) closeApplyModal();
  });

  // Handle Modal Form Submit
  modalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = modalForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting Application...`;

    try {
      const payload = Object.fromEntries(new FormData(modalForm).entries());
      const response = await fetch('/api/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to submit application.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      modalForm.reset();
      closeApplyModal();
      showToast('Application Submitted!', 'Your application has been received. Our HR team will contact you shortly.');
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      showToast('Submission failed', error.message || 'Please try again.');
    }
  });

  // 6. Contact Form Handler
  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending Message...`;

    try {
      const payload = Object.fromEntries(new FormData(contactForm).entries());
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send message.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      contactForm.reset();
      showToast('Message Sent!', 'Thank you for reaching out to N.F International. We will respond promptly.');
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      showToast('Message failed', error.message || 'Please try again.');
    }
  });

  // 7. Toast Notification Utility
  function showToast(title, message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.querySelector('.toast-title').textContent = title;
    toast.querySelector('.toast-message').textContent = message;
    
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 5000);
  }

  // 8. Key Metrics Counter Animation
  const statNumbers = document.querySelectorAll('.counter-val');
  let animated = false;

  function runCounters() {
    statNumbers.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target') || '0', 10);
      const suffix = counter.getAttribute('data-suffix') || '';
      let count = 0;
      const speed = Math.ceil(target / 60);

      const updateCount = () => {
        count += speed;
        if (count < target) {
          counter.innerText = count.toLocaleString() + suffix;
          requestAnimationFrame(updateCount);
        } else {
          counter.innerText = target.toLocaleString() + suffix;
        }
      };
      updateCount();
    });
  }

  const observerOptions = { threshold: 0.5 };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        runCounters();
        animated = true;
      }
    });
  }, observerOptions);

  const heroSection = document.querySelector('.hero-section');
  if (heroSection) observer.observe(heroSection);
});
