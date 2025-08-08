'use client';
import LegalLayout from 'components/marketing/LegalLayout';
import '../../styles/marketing.css';

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your information"
      lastUpdated="January 2025"
    >
      <h2>1. Information We Collect</h2>
      <p>
        We collect information to provide and improve our market intelligence
        services. The types of information we collect include:
      </p>

      <h3>Personal Information</h3>
      <ul>
        <li>Name, email address, and contact information when you register</li>
        <li>Company information and job title for B2B services</li>
        <li>
          Payment information processed through secure third-party providers
        </li>
        <li>Communications between you and Hyperformant</li>
      </ul>

      <h3>Usage Information</h3>
      <ul>
        <li>How you interact with our platform and services</li>
        <li>Device information, IP addresses, and browser details</li>
        <li>Pages visited, features used, and time spent on our platform</li>
        <li>Search queries and report generation activities</li>
      </ul>

      <h3>Third-Party Data</h3>
      <ul>
        <li>Publicly available business information for market analysis</li>
        <li>Social media sentiment data from public sources</li>
        <li>CRM data when you integrate with services like Apollo.io</li>
        <li>Market intelligence data from legitimate business sources</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our market intelligence services</li>
        <li>
          Generate Market Forces Analysis reports and competitive insights
        </li>
        <li>Process payments and manage your subscription</li>
        <li>Send service-related communications and updates</li>
        <li>Analyze usage patterns to enhance user experience</li>
        <li>Comply with legal obligations and protect our rights</li>
      </ul>

      <h2>3. Information Sharing and Disclosure</h2>
      <p>
        We do not sell, trade, or rent your personal information. We may share
        information in the following circumstances:
      </p>
      <ul>
        <li>
          <strong>With Your Consent:</strong> When you explicitly agree to
          information sharing
        </li>
        <li>
          <strong>Service Providers:</strong> With trusted third-parties who
          assist in operating our platform
        </li>
        <li>
          <strong>Legal Requirements:</strong> When required by law, regulation,
          or legal process
        </li>
        <li>
          <strong>Business Transfers:</strong> In connection with mergers,
          acquisitions, or asset sales
        </li>
        <li>
          <strong>Safety and Protection:</strong> To protect the rights,
          property, or safety of our users
        </li>
      </ul>

      <h2>4. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to
        protect your personal information:
      </p>
      <ul>
        <li>End-to-end encryption for data transmission</li>
        <li>Secure cloud infrastructure with access controls</li>
        <li>Regular security audits and vulnerability assessments</li>
        <li>Employee training on data protection and privacy practices</li>
        <li>Incident response procedures for potential data breaches</li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>
        We retain your personal information for as long as necessary to provide
        our services and fulfill the purposes outlined in this policy. Specific
        retention periods include:
      </p>
      <ul>
        <li>
          Account information: Until account deletion or 3 years after last
          activity
        </li>
        <li>Payment records: 7 years for tax and accounting purposes</li>
        <li>Usage analytics: Aggregated data may be retained indefinitely</li>
        <li>Marketing communications: Until you unsubscribe</li>
      </ul>

      <h2>6. Your Privacy Rights</h2>
      <p>
        Depending on your location, you may have the following rights regarding
        your personal information:
      </p>
      <ul>
        <li>
          <strong>Access:</strong> Request a copy of your personal information
        </li>
        <li>
          <strong>Correction:</strong> Update or correct inaccurate information
        </li>
        <li>
          <strong>Deletion:</strong> Request deletion of your personal
          information
        </li>
        <li>
          <strong>Portability:</strong> Receive your data in a structured format
        </li>
        <li>
          <strong>Objection:</strong> Object to processing based on legitimate
          interests
        </li>
        <li>
          <strong>Restriction:</strong> Request limitation of processing
          activities
        </li>
      </ul>

      <h2>7. Cookies and Tracking Technologies</h2>
      <p>We use cookies and similar technologies to:</p>
      <ul>
        <li>Remember your preferences and settings</li>
        <li>Analyze website traffic and user behavior</li>
        <li>Provide personalized content and recommendations</li>
        <li>Improve our platform's functionality and performance</li>
      </ul>
      <p>
        You can control cookie settings through your browser, though this may
        affect platform functionality.
      </p>

      <h2>8. International Data Transfers</h2>
      <p>
        Your information may be transferred to and processed in countries other
        than your own. We ensure appropriate safeguards are in place, including:
      </p>
      <ul>
        <li>Standard contractual clauses approved by relevant authorities</li>
        <li>Adequacy decisions for countries with equivalent protection</li>
        <li>Certification programs ensuring appropriate data protection</li>
      </ul>

      <h2>9. Children's Privacy</h2>
      <p>
        Our services are not directed to individuals under 18 years of age. We
        do not knowingly collect personal information from children under 18. If
        you become aware that a child has provided us with personal information,
        please contact us.
      </p>

      <h2>10. Third-Party Integrations</h2>
      <p>
        Our platform integrates with third-party services like Apollo.io. When
        you connect these services:
      </p>
      <ul>
        <li>You authorize data sharing as necessary for functionality</li>
        <li>Third-party privacy policies also apply to their data handling</li>
        <li>
          You can disconnect integrations at any time through your account
          settings
        </li>
      </ul>

      <h2>11. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy periodically. Material changes will be
        communicated through:
      </p>
      <ul>
        <li>Email notifications to registered users</li>
        <li>Prominent notices on our platform</li>
        <li>Updates to the "Last Updated" date</li>
      </ul>

      <h2>12. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or our privacy
        practices, please contact us:
      </p>
      <p>
        <strong>Hyperformant, Inc.</strong>
        <br />
        Email:{' '}
        <a href="mailto:privacy@hyperformant.io">privacy@hyperformant.io</a>
        <br />
        Website: <a href="https://hyperformant.io">hyperformant.io</a>
      </p>

      <p>
        For GDPR-related inquiries, please include "GDPR Request" in your email
        subject line.
      </p>
    </LegalLayout>
  );
}
