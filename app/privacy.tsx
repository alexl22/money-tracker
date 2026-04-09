import React from 'react';
import { ScrollView, StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';

export default function PrivacyPolicyScreen() {
  const handleEmailPress = () => {
    Linking.openURL('mailto:suport.moneytracker@gmail.com');
  };

  const handleWebPress = () => {
    Linking.openURL('https://alexl22.github.io/privacy-policy/');
  };

  const Section = ({ title, children, id }: { title: string, children: React.ReactNode, id?: string }) => (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>PRIVACY POLICY</Text>
      <Text style={styles.lastUpdated}>Last updated April 08, 2026</Text>
      <TouchableOpacity onPress={handleWebPress}>
        <Text style={[styles.lastUpdated, { color: '#3b82f6', textDecorationLine: 'underline', marginBottom: 24 }]}>
          View web version
        </Text>
      </TouchableOpacity>

      <Text style={styles.paragraph}>
        This Privacy Notice for Money Tracker: Daily Finance ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you download and use our mobile application (Money Tracker: Daily Finance), or any other application of ours that links to this Privacy Notice.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
           Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at suport.moneytracker@gmail.com.
        </Text>
      </View>

      <Section title="SUMMARY OF KEY POINTS">
        <Text style={styles.paragraph}>
          This summary provides key points from our Privacy Notice. We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.
        </Text>
        <Text style={styles.bulletPoint}>• What personal information do we process? We process information you disclose to us (name, email).</Text>
        <Text style={styles.bulletPoint}>• Do we process sensitive info? Yes, financial data with your consent.</Text>
        <Text style={styles.bulletPoint}>• Do we share info? Only in specific situations like business transfers.</Text>
      </Section>

      <View style={styles.tocContainer}>
        <Text style={styles.tocTitle}>TABLE OF CONTENTS</Text>
        {[
          "1. WHAT INFORMATION DO WE COLLECT?",
          "2. HOW DO WE PROCESS YOUR INFORMATION?",
          "3. WHAT LEGAL BASES DO WE RELY ON?",
          "4. WHEN AND WITH WHOM DO WE SHARE DATA?",
          "5. HOW LONG DO WE KEEP YOUR INFORMATION?",
          "6. HOW DO WE KEEP YOUR INFORMATION SAFE?",
          "7. DO WE COLLECT INFORMATION FROM MINORS?",
          "8. WHAT ARE YOUR PRIVACY RIGHTS?",
          "9. CONTROLS FOR DO-NOT-TRACK FEATURES",
          "10. US SPECIFIC PRIVACY RIGHTS",
          "11. DO WE MAKE UPDATES TO THIS NOTICE?",
          "12. HOW CAN YOU CONTACT US?",
          "13. REVIEW, UPDATE, OR DELETE DATA"
        ].map((item, index) => (
          <Text key={index} style={styles.tocItem}>{item}</Text>
        ))}
      </View>

      <Section title="1. WHAT INFORMATION DO WE COLLECT?">
        <Text style={styles.subHeading}>Personal information you disclose to us</Text>
        <Text style={styles.paragraph}>
          We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us, or when you contact us.
        </Text>
        <Text style={styles.bulletPoint}>• Personal Information: names, email addresses.</Text>
        <Text style={styles.subHeading}>Sensitive Information</Text>
        <Text style={styles.paragraph}>We process financial data when necessary with your consent. Financial data entered by users is stored securely and is not shared with third parties.</Text>
        <Text style={styles.subHeading}>Application Data</Text>
        <Text style={styles.paragraph}>We may request access to Push Notifications for account features.</Text>
      </Section>

      <Section title="2. HOW DO WE PROCESS YOUR INFORMATION?">
        <Text style={styles.paragraph}>
          We process your information to:
          {"\n"}• Facilitate account creation and authentication.
          {"\n"}• Deliver and facilitate delivery of services.
          {"\n"}• Respond to user inquiries and offer support.
          {"\n"}• To save or protect an individual's vital interest.
          {"\n"}• We use third-party services such as Firebase (by Google) for authentication and database storage.
        </Text>
      </Section>

      <Section title="3. WHAT LEGAL BASES DO WE RELY ON?">
        <Text style={styles.paragraph}>
          If you are in the EU/UK, we rely on: Consent, Performance of a Contract, Legal Obligations, and Vital Interests.
        </Text>
      </Section>

      <Section title="4. WHEN AND WITH WHOM DO WE SHARE DATA?">
        <Text style={styles.paragraph}>
          We may share your information in connection with a merger, sale of assets, or financing. We do not sell your personal information.
        </Text>
      </Section>

      <Section title="5. HOW LONG DO WE KEEP YOUR INFORMATION?">
        <Text style={styles.paragraph}>
          We keep your information for as long as you have an account with us, unless a longer period is required by law.
        </Text>
      </Section>

      <Section title="6. HOW DO WE KEEP YOUR INFORMATION SAFE?">
        <Text style={styles.paragraph}>
          We have implemented technical and organizational security measures. However, no electronic transmission is 100% secure.
        </Text>
      </Section>

      <Section title="7. DO WE COLLECT INFORMATION FROM MINORS?">
        <Text style={styles.paragraph}>
          We do not knowingly collect data from children under 18 years of age.
        </Text>
      </Section>

      <Section title="8. WHAT ARE YOUR PRIVACY RIGHTS?">
        <Text style={styles.paragraph}>
          Depending on your location (EEA, UK, Switzerland, Canada), you have rights to access, rectify, or erase your data.
        </Text>
      </Section>

      <Section title="9. CONTROLS FOR DO-NOT-TRACK FEATURES">
        <Text style={styles.paragraph}>
          Most browsers include a Do-Not-Track ("DNT") feature. We do not currently respond to DNT signals.
        </Text>
      </Section>

      <Section title="10. US SPECIFIC PRIVACY RIGHTS">
        <Text style={styles.subHeading}>Categories of Personal Information</Text>
        <Text style={styles.paragraph}>
          We collect: Identifiers (Name, Email), Financial Information, and Sensitive Information (Account login).
        </Text>
        <Text style={styles.paragraph}>
          Residents of California, Colorado, and other states have specific rights to know, delete, and correct their data.
        </Text>
      </Section>

      <Section title="11. DO WE MAKE UPDATES TO THIS NOTICE?">
        <Text style={styles.paragraph}>
          Yes, we may update this notice from time to time. The updated version will be indicated by an updated "Revised" date.
        </Text>
      </Section>

      <Section title="12. HOW CAN YOU CONTACT US?">
        <Text style={styles.paragraph}>
          If you have questions about this notice, email us at:
        </Text>
        <TouchableOpacity onPress={handleEmailPress}>
          <Text style={styles.emailLink}>suport.moneytracker@gmail.com</Text>
        </TouchableOpacity>
      </Section>

      <Section title="13. REVIEW, UPDATE, OR DELETE DATA">
        <Text style={styles.paragraph}>
          Based on the laws of your country, you may have the right to request access to your data. To review or delete, please contact us. Users can request account deletion by contacting us at suport.moneytracker@gmail.com, or through the "Delete Account" button in the app Settings.
        </Text>
      </Section>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c14ff',
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  title: {
    fontSize: 26,
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    marginBottom: 24,
  },
  infoText: {
    color: '#3b82f6',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  heading: {
    fontSize: 18,
    color: '#3b82f6',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  subHeading: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginLeft: 12,
    marginBottom: 4,
  },
  tocContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  tocTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  tocItem: {
    fontSize: 13,
    color: '#3b82f6',
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  emailLink: {
    fontSize: 15,
    color: '#3b82f6',
    textDecorationLine: 'underline',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
});
