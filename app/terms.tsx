import React from 'react';
import { ScrollView, StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.heading}>{title}</Text>
    {children}
  </View>
);

export default function TermsOfUseScreen() {
  const router = useRouter();
  const handleEmailPress = () => {
    Linking.openURL('mailto:suport.moneytracker@gmail.com');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Terms of Use</Text>
      <Text style={styles.lastUpdated}>Last updated April 08, 2026</Text>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          These Legal Terms constitute a legally binding agreement made between you and Money Tracker: Daily Finance concerning your access to and use of our Services.
        </Text>
      </View>

      <Section title="AGREEMENT TO OUR LEGAL TERMS">
        <Text style={styles.paragraph}>
          We are Money Tracker: Daily Finance ("Company," "we," "us," "our"). We operate the Money Tracker: Daily Finance mobile application, as well as any other related products and services that refer or link to these legal terms (the "Legal Terms") (collectively, the "Services").
        </Text>
        <Text style={[styles.paragraph, { marginTop: 12 }]}>
          You can contact us by email at suport.moneytracker@gmail.com.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 12 }]}>
          Your use of the Services is also governed by our Privacy Policy, which is incorporated into these Legal Terms by reference.
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/privacy')}
          style={styles.linkButton}
        >
          <Text style={styles.linkButtonText}>Read Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={[styles.paragraph, { marginTop: 12, fontWeight: 'bold', color: '#FFFFFF' }]}>
          IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.
        </Text>
      </Section>

      <View style={styles.tocContainer}>
        <Text style={styles.tocTitle}>Table of Contents</Text>
        {[
          '1. OUR SERVICES',
          '2. INTELLECTUAL PROPERTY RIGHTS',
          '3. USER REPRESENTATIONS',
          '4. PROHIBITED ACTIVITIES',
          '5. USER GENERATED CONTRIBUTIONS',
          '6. CONTRIBUTION LICENSE',
          '7. SERVICES MANAGEMENT',
          '8. TERM AND TERMINATION',
          '9. MODIFICATIONS AND INTERRUPTIONS',
          '10. GOVERNING LAW',
          '11. DISPUTE RESOLUTION',
          '12. CORRECTIONS',
          '13. DISCLAIMER',
          '14. LIMITATIONS OF LIABILITY',
          '15. INDEMNIFICATION',
          '16. USER DATA',
          '17. ELECTRONIC COMMUNICATIONS',
          '18. MISCELLANEOUS',
          '19. CONTACT US'
        ].map((item, index) => (
          <Text key={index} style={styles.tocItem}>{item}</Text>
        ))}
      </View>

      <Section title="1. OUR SERVICES">
        <Text style={styles.paragraph}>
          The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation. Accordingly, those persons who choose to access the Services from other locations do so on their own initiative and are solely responsible for compliance with local laws.
        </Text>
      </Section>

      <Section title="2. INTELLECTUAL PROPERTY RIGHTS">
        <Text style={styles.subHeading}>Our intellectual property</Text>
        <Text style={styles.paragraph}>
          We are the owner or the licensee of all intellectual property rights in our Services, including all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics in the Services (collectively, the "Content"), as well as the trademarks, service marks, and logos contained therein (the "Marks").
        </Text>
        <Text style={[styles.paragraph, { marginTop: 12 }]}>
          Our Content and Marks are protected by copyright and trademark laws (and various other intellectual property rights and unfair competition laws) around the world. The Content and Marks are provided in or through the Services "AS IS" for your personal, non-commercial use only.
        </Text>
        
        <Text style={styles.subHeading}>Your use of our Services</Text>
        <Text style={styles.paragraph}>
          Subject to your compliance with these Legal Terms, including the "PROHIBITED ACTIVITIES" section below, we grant you a non-exclusive, non-transferable, revocable license to access the Services and download or print a copy of any portion of the Content to which you have properly gained access, solely for your personal, non-commercial use.
        </Text>
      </Section>

      <Section title="3. USER REPRESENTATIONS">
        <Text style={styles.paragraph}>
          By using the Services, you represent and warrant that: (1) you have the legal capacity and you agree to comply with these Legal Terms; (2) you are not a minor in the jurisdiction in which you reside; (3) you will not access the Services through automated or non-human means; (4) you will not use the Services for any illegal or unauthorized purpose; and (5) your use of the Services will not violate any applicable law or regulation.
        </Text>
      </Section>

      <Section title="4. PROHIBITED ACTIVITIES">
        <Text style={styles.paragraph}>
          You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
        </Text>
        <Text style={[styles.bulletPoint, { marginTop: 8 }]}>• Trick, defraud, or mislead us and other users.</Text>
        <Text style={styles.bulletPoint}>• Circumvent, disable, or otherwise interfere with security-related features of the Services.</Text>
        <Text style={styles.bulletPoint}>• Disparage, tarnish, or otherwise harm us and/or the Services.</Text>
        <Text style={styles.bulletPoint}>• Use any information obtained from the Services in order to harass, abuse, or harm another person.</Text>
        <Text style={styles.bulletPoint}>• Use the Services in a manner inconsistent with any applicable laws or regulations.</Text>
        <Text style={styles.bulletPoint}>• Upload or transmit viruses, Trojan horses, or other material that interferes with any party's uninterrupted use.</Text>
        <Text style={styles.bulletPoint}>• Delete the copyright or other proprietary rights notice from any Content.</Text>
        <Text style={styles.bulletPoint}>• Attempt to impersonate another user or person.</Text>
        <Text style={styles.bulletPoint}>• Copy or adapt the Services' software, including but not limited to JavaScript or other code.</Text>
      </Section>

      <Section title="5. USER GENERATED CONTRIBUTIONS">
        <Text style={styles.paragraph}>
          Users may input personal financial data (such as transactions), which is used solely for providing the Services. The Services does not otherwise offer users the ability to submit or post content publicly. However, we may provide you with the opportunity to provide suggestions or feedback ("Contributions").
        </Text>
      </Section>

      <Section title="6. CONTRIBUTION LICENSE">
        <Text style={styles.paragraph}>
          You and Services agree that we may access, store, process, and use any information and personal data that you provide and your choices (including settings). By submitting suggestions or other feedback regarding the Services, you agree that we can use and share such feedback for any purpose without compensation to you.
        </Text>
      </Section>

      <Section title="7. SERVICES MANAGEMENT">
        <Text style={styles.paragraph}>
          We reserve the right, but not the obligation, to: (1) monitor the Services for violations of these Legal Terms; (2) take appropriate legal action against anyone who violates the law or these Legal Terms; (3) in our sole discretion, refuse, restrict access to, limit the availability of, or disable any of your Contributions; and (4) otherwise manage the Services in a manner designed to protect our rights and property.
        </Text>
      </Section>

      <Section title="8. TERM AND TERMINATION">
        <Text style={styles.paragraph}>
          These Legal Terms shall remain in full force and effect while you use the Services. WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON.
        </Text>
      </Section>

      <Section title="9. MODIFICATIONS AND INTERRUPTIONS">
        <Text style={styles.paragraph}>
          We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at our sole discretion without notice. We cannot guarantee the Services will be available at all times. You agree that we have no liability whatsoever for any loss, damage, or inconvenience caused by your inability to access or use the Services during any downtime.
        </Text>
      </Section>

      <Section title="10. GOVERNING LAW">
        <Text style={styles.paragraph}>
          These Legal Terms shall be governed by and defined following the laws of Romania. Money Tracker: Daily Finance and yourself irrevocably consent that the courts of Romania shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these Legal Terms.
        </Text>
      </Section>

      <Section title="11. DISPUTE RESOLUTION">
        <Text style={styles.subHeading}>Informal Negotiations</Text>
        <Text style={styles.paragraph}>
          To expedite resolution and control the cost of any dispute, the Parties agree to first attempt to negotiate any Dispute informally for at least 30 days before initiating arbitration.
        </Text>
        <Text style={styles.subHeading}>Binding Arbitration</Text>
        <Text style={styles.paragraph}>
          Any dispute arising out of or in connection with these Legal Terms shall be referred to and finally resolved by the International Commercial Arbitration Court under the Chamber of Commerce and Industry of Romania according to its Rules. The number of arbitrators shall be one. The seat, or legal place, or arbitration shall be Bucharest, Romania. The language of the proceedings shall be English.
        </Text>
      </Section>

      <Section title="12. CORRECTIONS">
        <Text style={styles.paragraph}>
          There may be information on the Services that contains typographical errors, inaccuracies, or omissions. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update the information on the Services at any time, without prior notice.
        </Text>
      </Section>

      <Section title="13. DISCLAIMER">
        <Text style={styles.paragraph}>
          THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF.
        </Text>
      </Section>

      <Section title="14. LIMITATIONS OF LIABILITY">
        <Text style={styles.paragraph}>
          IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER WILL AT ALL TIMES BE LIMITED TO THE AMOUNT PAID, IF ANY, BY YOU TO US.
        </Text>
      </Section>

      <Section title="15. INDEMNIFICATION">
        <Text style={styles.paragraph}>
          You agree to defend, indemnify, and hold us harmless from and against any loss, damage, liability, claim, or demand, including reasonable attorneys' fees and expenses, made by any third party due to or arising out of: (1) use of the Services; (2) breach of these Legal Terms; (3) your violation of the rights of a third party, including but not limited to intellectual property rights.
        </Text>
      </Section>

      <Section title="16. USER DATA">
        <Text style={styles.paragraph}>
          We will maintain certain data that you transmit to the Services for the purpose of managing the performance of the Services. Although we perform regular routine backups of data, you are solely responsible for all data that you transmit or that relates to any activity you have undertaken using the Services.
        </Text>
      </Section>

      <Section title="17. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES">
        <Text style={styles.paragraph}>
          Visiting the Services, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications, and you agree that all agreements, notices, disclosures, and other communications we provide to you electronically satisfy any legal requirement that such communication be in writing.
        </Text>
      </Section>

      <Section title="18. MISCELLANEOUS">
        <Text style={styles.paragraph}>
          These Legal Terms and any policies or operating rules posted by us on the Services constitute the entire agreement and understanding between you and us. Our failure to exercise or enforce any right or provision of these Legal Terms shall not operate as a waiver of such right or provision.
        </Text>
      </Section>

      <Section title="19. CONTACT US">
        <Text style={styles.paragraph}>
          In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:
        </Text>
        <TouchableOpacity onPress={handleEmailPress} style={styles.contactContainer}>
          <Ionicons name="mail" size={24} color="#3b82f6" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactValue}>suport.moneytracker@gmail.com</Text>
          </View>
        </TouchableOpacity>
      </Section>

      <View style={{ height: 40 }} />
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
    fontSize: 28,
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginLeft: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  tocContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tocTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 16,
  },
  tocItem: {
    fontSize: 13,
    color: '#3b82f6',
    fontFamily: 'Inter_500Medium',
    marginBottom: 10,
  },
  section: {
    marginBottom: 32,
  },
  heading: {
    fontSize: 18,
    color: '#3b82f6',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  subHeading: {
    fontSize: 15,
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
  },
  bulletPoint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    paddingLeft: 4,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  contactInfo: {
    marginLeft: 16,
  },
  contactLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  contactValue: {
    color: '#3b82f6',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 4,
  },
});

