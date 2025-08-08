'use client';
import LegalLayout from 'components/marketing/LegalLayout';
import '../../styles/marketing.css';

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Please read these terms carefully before using our services"
      lastUpdated="January 2025"
    >
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using Hyperformant's services, you accept and agree to
        be bound by the terms and provision of this agreement. These Terms of
        Service ("Terms") govern your use of our AI-powered market intelligence
        platform and related services.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Hyperformant provides an AI-powered B2B automation and market
        intelligence platform that combines CRM integration, research
        automation, and revenue generation workflows. Our service includes:
      </p>
      <ul>
        <li>Market Forces Analysis and competitive intelligence reports</li>
        <li>AI-powered sentiment analysis and market research</li>
        <li>Apollo.io CRM integration and automation workflows</li>
        <li>Business intelligence and revenue optimization tools</li>
      </ul>

      <h2>3. User Accounts and Registration</h2>
      <p>
        To access certain features of our service, you must register for an
        account. You agree to:
      </p>
      <ul>
        <li>
          Provide accurate, current, and complete information during
          registration
        </li>
        <li>Maintain and promptly update your account information</li>
        <li>Maintain the security of your password and account</li>
        <li>Accept responsibility for all activities under your account</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>
        You agree to use our services only for lawful purposes and in accordance
        with these Terms. You agree not to:
      </p>
      <ul>
        <li>
          Use the service for any unlawful purpose or to solicit unlawful
          activity
        </li>
        <li>Attempt to gain unauthorized access to our systems or networks</li>
        <li>Interfere with or disrupt our services or servers</li>
        <li>Use our platform to send spam or unsolicited communications</li>
        <li>Violate any applicable laws, regulations, or third-party rights</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>
        The service and its original content, features, and functionality are
        and will remain the exclusive property of Hyperformant, Inc. and its
        licensors. The service is protected by copyright, trademark, and other
        laws.
      </p>

      <h2>6. Privacy and Data Protection</h2>
      <p>
        Your privacy is important to us. Please review our Privacy Policy, which
        also governs your use of the service, to understand our practices
        regarding the collection, use, and disclosure of your information.
      </p>

      <h2>7. Payment Terms</h2>
      <p>
        Paid services are billed in advance on a monthly or annual basis. All
        fees are non-refundable unless otherwise stated. We reserve the right to
        change our pricing at any time with reasonable notice.
      </p>

      <h2>8. Service Availability</h2>
      <p>
        We strive to provide reliable service but cannot guarantee 100% uptime.
        We reserve the right to modify, suspend, or discontinue any part of our
        service at any time without notice.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        In no event shall Hyperformant, Inc., nor its directors, employees,
        partners, agents, suppliers, or affiliates, be liable for any indirect,
        incidental, special, consequential, or punitive damages, including
        without limitation, loss of profits, data, use, goodwill, or other
        intangible losses, resulting from your use of the service.
      </p>

      <h2>10. Disclaimer</h2>
      <p>
        The information provided through our service is for informational
        purposes only. While we strive for accuracy, we make no warranties about
        the completeness, reliability, or accuracy of market intelligence data
        and competitive analysis.
      </p>

      <h2>11. Termination</h2>
      <p>
        We may terminate or suspend your account and bar access to the service
        immediately, without prior notice or liability, under our sole
        discretion, for any reason whatsoever, including without limitation if
        you breach the Terms.
      </p>

      <h2>12. Changes to Terms</h2>
      <p>
        We reserve the right to modify or replace these Terms at any time. If a
        revision is material, we will provide at least 30 days notice prior to
        any new terms taking effect.
      </p>

      <h2>13. Contact Information</h2>
      <p>
        If you have any questions about these Terms of Service, please contact
        us at:
      </p>
      <p>
        <strong>Hyperformant, Inc.</strong>
        <br />
        Email: <a href="mailto:legal@hyperformant.io">legal@hyperformant.io</a>
        <br />
        Website: <a href="https://hyperformant.io">hyperformant.io</a>
      </p>
    </LegalLayout>
  );
}
