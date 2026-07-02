/* PROLOGUE
File name: userguide.tsx
Description: Provide a user guide for assistance in using the application
Programmers: Blake Carlson
Creation date: 4/21/2026
Revision date:
  - 7/1/26: Rebuilt layout to scroll properly, match the app's visual language, and
            collapse duplicated feature blocks into data-driven cards
Preconditions: A React application requesting the userguide route (/userguide)
Postconditions: An interactive user guide for users to learn how to use the application
Errors: None
Side effects: None
Invariants: None
Known faults: Demo videos are web-only (native shows a fallback card).
*/

import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions, ScrollView } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { border, heroGradient, navy, pageBg, surfaceSoft, textPrimary, textSecondary } from "../theme/colors";

/** Below this width, shrink the navbar logo/brand. */
const COMPACT_NAV_BREAKPOINT = 480;
/** Below this width, stack a feature's text above its video instead of side-by-side. */
const STACKED_FEATURE_BREAKPOINT = 820;

type GuideTip = { label: string; text: string };
type GuideSection = {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  paragraphs: string[];
  tips?: GuideTip[];
  video: number;
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "account",
    title: "Account Creation and Login",
    icon: "account-key-outline",
    paragraphs: [
      "The homepage is where you log in or create a new account to access your personalized household management dashboard.",
      'New here? Click "Create Account" and provide your name, a valid email address, and a secure password. Once it succeeds, you\'ll land straight on your new dashboard.',
      'Already have an account? Enter your email and password and click "Login" to reach your dashboard.',
    ],
    video: require("../assets/videos/login_acct_creation_demo.mp4"),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: "view-dashboard-outline",
    paragraphs: [
      "The dashboard is the central hub of the app — it's where you create and access your households. Each household represents a living space, like an apartment or a house.",
      'Open a household by clicking its name under "Your Households."',
    ],
    tips: [
      { label: "Create a household", text: 'Click "Create New Household" and give it a name.' },
      { label: "Join or share a household", text: 'Use "Join with a Code" to join someone else\'s household, or share your own code so others can join and collaborate.' },
      { label: "Manage a household", text: "Click the three dots next to a household's name. Options depend on your role — creators are admins and can promote other members to admin." },
      { label: "Admin settings", text: "Update the household name or join code, or delete the household entirely." },
      { label: "Member settings", text: "View household members, or leave the household." },
    ],
    video: require("../assets/videos/login_acct_creation_demo.mp4"),
  },
  {
    id: "3d-view",
    title: "3D View",
    icon: "rotate-3d-variant",
    paragraphs: [
      "The 3D View visualizes your living space in three dimensions. Rotate and zoom to explore your room from different angles — handy for planning furniture arrangements and interior design.",
    ],
    tips: [
      { label: "Rotate", text: "Click and drag left or right to rotate the view." },
      { label: "Zoom", text: "Pinch with two fingers on a touch device, or hold Ctrl and scroll with a trackpad or mouse wheel." },
      { label: "Change room", text: "Use the left and right arrow buttons near the top of the screen." },
      { label: "Place a feature", text: "Select an unplaced feature from the bar at the bottom and click where it should go on the grid." },
      { label: "Edit a feature", text: "Click any placed feature to open its edit panel — move, rotate, resize it, manage its tasks, or remove it and send it back to the unplaced bar." },
      { label: "Edit vs. View mode", text: "Toggle with the button in the top-left, or just click a feature to jump straight into Edit mode. View mode is for looking around and placing new features." },
    ],
    video: require("../assets/videos/3d_view_demo.mp4"),
  },
  {
    id: "list-view",
    title: "List View",
    icon: "format-list-bulleted",
    paragraphs: [
      "The List View gives you a complete overview of your household, showing every room and its contents in a hierarchical list — the easiest way to navigate and manage your space and tasks.",
    ],
    tips: [
      { label: "Structure", text: "Household → Rooms → Features → Tasks" },
      { label: "Rooms", text: "Create and delete rooms from the top of the page. Each room can be expanded to reveal its features." },
      { label: "Features", text: "Create and delete features within a room. Each one has a name and an icon." },
      { label: "Tasks", text: "Create and delete tasks within a feature, each with a name, icon, and frequency (in days). Tap the checkmark to mark a task complete and reset its timer." },
    ],
    video: require("../assets/videos/list_view_demo.mp4"),
  },
];

/** Renders a demo video on web; native falls back to a simple placeholder card. */
function GuideVideo({ source, style, autoPlayLoop }: { source: number; style: any; autoPlayLoop?: boolean }) {
  if (Platform.OS !== "web") {
    return (
      <View style={[style, styles.videoFallback]}>
        <MaterialCommunityIcons name="play-circle-outline" size={36} color="#FFFFFF" />
        <Text style={styles.videoFallbackText}>Video guide available in the web app</Text>
      </View>
    );
  }
  return (
    <video
      autoPlay={autoPlayLoop}
      muted={autoPlayLoop}
      loop={autoPlayLoop}
      playsInline
      controls
      style={style}
    >
      <source src={source as unknown as string} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}

export default function UserGuide() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [hoverBack, setHoverBack] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < COMPACT_NAV_BREAKPOINT;
  const isStacked = windowWidth < STACKED_FEATURE_BREAKPOINT;
  const logoIconSize = isCompact ? 22 : 28;

  return (
    <View style={styles.screen}>
      {/* Navbar */}
      <View style={[styles.navbar, isCompact && styles.navbarCompact]}>
        <Pressable
          onPress={() => router.push("/home")}
          style={({ pressed }) => [
            styles.backBtn,
            Platform.OS === "web" && hoverBack && styles.backBtnHover,
            pressed && styles.backBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          hitSlop={8}
          // @ts-ignore web-only pointer hover
          onMouseEnter={() => Platform.OS === "web" && setHoverBack(true)}
          // @ts-ignore web-only pointer hover
          onMouseLeave={() => Platform.OS === "web" && setHoverBack(false)}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={[styles.logoBox, isCompact && styles.logoBoxCompact]}>
          <MaterialCommunityIcons name="home" size={logoIconSize} color="#FFFFFF" />
        </View>
        <Text
          style={[styles.navBrand, isCompact && styles.navBrandCompact, { cursor: "pointer" }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          onPress={() => router.push("/home")}
        >
          HomeSeeHome
        </Text>
        <View style={styles.navSpacer} />
        {!isCompact && (
          <Text style={[styles.navBrand, styles.navBrandActive, isCompact && styles.navBrandCompact]}>
            User Guide
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === "web"}
      >
        <View style={styles.contentColumn}>
          <Text style={styles.pageTitle}>User Guide</Text>
          <Text style={styles.pageSubtitle}>Everything you need to get the most out of HomeSeeHome.</Text>

          <View style={styles.videoCard}>
            <GuideVideo source={require("../assets/videos/homeseehome_user_guide.mp4")} style={styles.mainVideo} />
          </View>
          <Text style={styles.videoCaption}>
            A walkthrough of HomeSeeHome's main features. Watch it for a quick overview, or jump straight to a topic below.
          </Text>

          <Text style={styles.sectionHeading}>Key Features</Text>
          <Text style={styles.sectionSubheading}>Tap a topic to expand it and see a detailed explanation with a demo.</Text>

          {GUIDE_SECTIONS.map((section) => {
            const isOpen = expandedSection === section.id;
            return (
              <View key={section.id} style={styles.featureCard}>
                <Pressable
                  onPress={() => setExpandedSection(isOpen ? null : section.id)}
                  style={({ pressed }) => [
                    styles.featureHeaderRow,
                    Platform.OS === "web" && hoveredSection === section.id && styles.featureHeaderRowHover,
                    pressed && styles.featureHeaderRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${section.title}`}
                  // @ts-ignore web-only pointer hover
                  onMouseEnter={() => Platform.OS === "web" && setHoveredSection(section.id)}
                  // @ts-ignore web-only pointer hover
                  onMouseLeave={() => Platform.OS === "web" && setHoveredSection(null)}
                >
                  <View style={styles.featureHeaderIcon}>
                    <MaterialCommunityIcons name={section.icon} size={19} color={navy} />
                  </View>
                  <Text style={styles.featureTitle} numberOfLines={1}>
                    {section.title}
                  </Text>
                  <MaterialCommunityIcons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={textSecondary}
                  />
                </Pressable>

                {isOpen && (
                  <View style={[styles.featureBody, isStacked && styles.featureBodyStacked]}>
                    <View style={[styles.featureText, isStacked && styles.featureTextStacked]}>
                      {section.paragraphs.map((paragraph, i) => (
                        <Text key={i} style={styles.paragraph}>
                          {paragraph}
                        </Text>
                      ))}
                      {section.tips && (
                        <View style={styles.tipList}>
                          {section.tips.map((tip) => (
                            <View key={tip.label} style={styles.tipRow}>
                              <Text style={styles.tipLabel}>{tip.label}: </Text>
                              <Text style={styles.tipText}>{tip.text}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={[styles.featureVideoWrap, isStacked && styles.featureVideoWrapStacked]}>
                      <GuideVideo source={section.video} style={styles.featureVideo} autoPlayLoop />
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.credits}>Created by Jack Bauer, Blake Carlson, Nifemi Lawal, Logan Smith, Dellie Wright</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: pageBg,
  },

  // Navbar
  navbar: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: navy,
    gap: 12,
  },
  navbarCompact: {
    height: 56,
    paddingHorizontal: 14,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backBtnHover: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.42)",
  },
  backBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: heroGradient[0],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A2B4D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  logoBoxCompact: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  navBrand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  navBrandCompact: {
    fontSize: 16,
  },
  navBrandActive: {
    opacity: 0.75,
  },
  navSpacer: {
    flex: 1,
  },

  // Scroll & content column
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 56,
    alignItems: "center",
  },
  contentColumn: {
    width: "100%",
    maxWidth: 880,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 16,
    color: textSecondary,
    textAlign: "center",
    marginBottom: 26,
  },

  videoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    width: "100%",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: border,
    shadowColor: "#AAB6C5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  mainVideo: {
    width: "100%",
    height: undefined,
    aspectRatio: 16 / 9,
    borderRadius: 12,
  } as any,
  videoCaption: {
    fontSize: 15,
    lineHeight: 22,
    color: textSecondary,
    textAlign: "center",
    maxWidth: 640,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 40,
  },

  sectionHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: textPrimary,
    marginBottom: 4,
  },
  sectionSubheading: {
    fontSize: 15,
    color: textSecondary,
    marginBottom: 18,
  },

  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: border,
    overflow: "hidden",
    shadowColor: "#AAB6C5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  featureHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  featureHeaderRowHover: {
    backgroundColor: surfaceSoft,
  },
  featureHeaderRowPressed: {
    opacity: 0.85,
  },
  featureHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: textPrimary,
    minWidth: 0,
  },

  featureBody: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: border,
  },
  featureBodyStacked: {
    flexDirection: "column",
  },
  featureText: {
    flex: 3,
    minWidth: 0,
  },
  featureTextStacked: {
    // featureText sets `flex: 3`, which is flex-grow:3 + flex-shrink:1 + flex-basis:0%.
    // Overriding flexGrow alone leaves flex-basis at 0%, still collapsing this item to
    // 0 height in the column layout - flexBasis must be reset back to content-sized too.
    flexGrow: 0,
    flexBasis: "auto",
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 23,
    color: textSecondary,
    marginBottom: 10,
  },
  tipList: {
    marginTop: 4,
    gap: 10,
  },
  tipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tipLabel: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    color: navy,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 21,
    color: textSecondary,
    flexShrink: 1,
  },

  featureVideoWrap: {
    flex: 2,
    justifyContent: "center",
    minWidth: 0,
  },
  featureVideoWrapStacked: {
    // See featureTextStacked - featureVideoWrap's `flex: 2` also needs flexBasis reset.
    flexGrow: 0,
    flexBasis: "auto",
    marginTop: 16,
  },
  featureVideo: {
    width: "100%",
    height: undefined,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: navy,
  } as any,

  videoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: navy,
    borderRadius: 12,
    paddingVertical: 24,
    gap: 8,
  },
  videoFallbackText: {
    color: "#FFFFFF",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 12,
  },

  credits: {
    fontSize: 13,
    color: textSecondary,
    textAlign: "center",
    marginTop: 32,
  },
});
