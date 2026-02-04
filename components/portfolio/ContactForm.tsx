'use client';

import { useState } from 'react';
import styles from '@/styles/public/ContactForm.module.css';

export function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Connect to backend API for form submission
    // For now, simulate a submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={styles.successMessage}>
        <p className={styles.successTitle}>Thank you!</p>
        <p className={styles.successText}>
          Your message has been sent. We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Name</label>
        <div className={styles.nameRow}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>First Name <span className={styles.required}>(required)</span></span>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Last Name <span className={styles.required}>(required)</span></span>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Email <span className={styles.required}>(required)</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={styles.input}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Message <span className={styles.required}>(required)</span>
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={6}
          className={styles.textarea}
        />
      </div>

      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
