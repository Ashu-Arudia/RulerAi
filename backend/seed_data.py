"""
Seed script — populates the SQLite database with 5 realistic demo meetings
each containing full transcripts, AI summaries, action items, and tags.
"""

import json
from datetime import datetime, timedelta
from database import SessionLocal, create_tables, Meeting, TranscriptLine, Summary, ActionItem, MeetingTag


MEETINGS_DATA = [
    {
        "title": "Q3 Product Roadmap Review",
        "date": datetime.now() - timedelta(days=2, hours=3),
        "duration_seconds": 2720,
        "host": "Sarah Chen",
        "participants": ["Sarah Chen", "Michael Torres", "Priya Nair", "James Okafor", "Emily Zhang", "David Kim", "Rachel Green", "Tom Walsh"],
        "thumbnail_color": "#6938ef",
        "channel": "My Meetings",
        "tags": ["roadmap", "product", "q3"],
        "transcript": [
            (0.0, 8.2, "Sarah Chen", "Good morning everyone. Thanks for joining our Q3 roadmap review. We have a lot to cover today so let's dive right in."),
            (8.5, 22.1, "Michael Torres", "Sounds good Sarah. Before we start, I wanted to mention that the engineering team has completed the preliminary assessment for the features we discussed last month."),
            (22.5, 38.7, "Sarah Chen", "Perfect timing Michael. Let's start with the top priority items. Feature number one is the real-time collaboration module. Where do we stand on that?"),
            (39.0, 58.4, "Priya Nair", "So from a design perspective, we have finalized the wireframes and the interactive prototype is ready. The user testing sessions scheduled for next week should give us solid validation data."),
            (59.0, 78.2, "James Okafor", "Engineering estimate for the collaboration module is six to eight weeks. That includes the WebSocket implementation, conflict resolution logic, and the presence indicators."),
            (78.8, 95.3, "Emily Zhang", "I've been tracking competitor features closely. Notion and Linear both released similar collaboration features recently, and users are expecting real-time cursors and live commenting as baseline functionality."),
            (96.0, 115.6, "Sarah Chen", "Good point Emily. Let's make sure our implementation doesn't just match but exceeds what competitors are offering. David, what's the product analytics tell us about user collaboration patterns?"),
            (116.2, 138.4, "David Kim", "Based on our telemetry, about 67% of our power users are working in teams right now. The biggest friction point they report is having to share static exports rather than collaborating directly in the tool."),
            (139.0, 158.7, "Rachel Green", "From the customer success side, we've had 23 enterprise customers specifically ask for this feature in Q3. Three of them mentioned it as a dealbreaker for their renewal in Q4."),
            (159.3, 178.0, "Tom Walsh", "I can confirm the infrastructure is ready to handle the scale. We've already migrated to the new distributed architecture that supports real-time synchronization."),
            (178.5, 198.2, "Sarah Chen", "Excellent. So collaboration module is priority one. Michael, let's lock in a six-week timeline and target a beta release by end of August. Agreed?"),
            (198.8, 208.4, "Michael Torres", "Agreed. I'll set up the engineering sprint and have a detailed breakdown ready by Thursday."),
            (209.0, 228.6, "Priya Nair", "I'll coordinate with James to make sure design handoffs happen in sync with their sprint planning."),
            (229.2, 248.5, "Sarah Chen", "Second priority — the AI insights dashboard. Emily, you prepared a detailed brief on this. Can you walk us through it?"),
            (249.0, 278.3, "Emily Zhang", "Absolutely. The AI insights dashboard is about surfacing patterns from user behavior — things like which features drive retention, identifying power users versus at-risk accounts, and predicting churn signals before they escalate."),
            (279.0, 298.4, "James Okafor", "We already have the data pipeline in place. The main work is building the ML models and the visualization layer. I'd estimate four weeks for the backend models and two weeks for the frontend dashboard."),
            (299.0, 318.7, "David Kim", "The analytics infrastructure can support this. We're collecting over two million events per day and the warehouse is already structured for this kind of analysis."),
            (319.3, 338.8, "Rachel Green", "This would be huge for our enterprise sales conversations. Being able to show customers their own usage patterns during demos would be a massive differentiator."),
            (339.5, 358.2, "Sarah Chen", "Let's target a six-week timeline for the AI insights dashboard including internal testing. Tom, can you ensure the infrastructure can handle the additional compute for ML model serving?"),
            (359.0, 378.4, "Tom Walsh", "Absolutely. We'll spin up dedicated inference clusters for this. Cost projection is about two thousand dollars per month at scale which is well within our infrastructure budget."),
            (379.0, 398.6, "Michael Torres", "Should we plan for a soft launch with a select group of beta customers before the full rollout?"),
            (399.2, 418.5, "Sarah Chen", "Yes, let's identify ten to fifteen power users from the enterprise segment for beta. Rachel, can you coordinate that with your customer success team?"),
            (419.0, 438.2, "Rachel Green", "Absolutely. I already have a list of customers who've expressed interest in early access programs. I'll have recommendations by end of week."),
            (438.8, 458.4, "Sarah Chen", "Perfect. Let's move to the third priority — mobile application expansion. We currently have iOS and Android apps but user feedback shows navigation is cumbersome on mobile."),
            (459.0, 478.6, "Priya Nair", "We did an extensive UX audit of the mobile apps. The core issue is that we're essentially running the desktop experience on mobile. We need native mobile patterns — gesture navigation, bottom sheet interactions, and simplified information architecture."),
            (479.2, 498.5, "James Okafor", "Mobile revamp is a significant undertaking. We're looking at eight to ten weeks on iOS and a parallel track on Android. The key is to redesign the navigation structure while maintaining feature parity."),
            (499.0, 518.3, "Sarah Chen", "For Q3, lets focus on the navigation overhaul and the three most-used mobile flows — dashboard, meeting search, and quick actions. We can tackle the deep feature work in Q4."),
            (519.0, 538.7, "David Kim", "Looking at mobile analytics, those three flows represent 78% of all mobile sessions. It makes perfect sense to prioritize them."),
            (539.3, 558.6, "Michael Torres", "I'd suggest we do a dedicated mobile hackathon with the engineering team to prototype the new navigation patterns. We could run it over a long weekend and have working prototypes to test within days."),
            (559.2, 578.5, "Sarah Chen", "Love that idea Michael. Let's schedule it for the last week of July. Priya, can your design team prepare the low-fidelity specs before then?"),
            (579.0, 598.3, "Priya Nair", "Definitely. We'll have the navigation architecture and key interaction patterns documented and ready for the hackathon."),
            (599.0, 618.6, "Sarah Chen", "Great. Any other items we need to discuss before we wrap up? We're coming up on our time."),
            (619.2, 638.4, "Emily Zhang", "Just want to flag that we should consider how these three initiatives interact from a user perspective. The mobile UI changes should align with the collaboration module so users get a consistent experience across platforms."),
            (639.0, 658.7, "Sarah Chen", "Excellent point Emily. James and Priya, please sync on cross-platform design consistency. We need a unified design language for all three initiatives."),
            (659.3, 678.5, "James Okafor", "Will do. I'll set up a cross-functional sync next week to align on this."),
            (679.0, 698.2, "Sarah Chen", "Perfect. To summarize — collaboration module is Q3 priority one with a six-week timeline, AI insights dashboard is priority two with a six-week timeline, and mobile navigation overhaul is priority three starting with the hackathon. Thanks everyone, let's make Q3 exceptional."),
        ],
        "summary": {
            "overview": "The Q3 product roadmap review covered three major initiatives: the real-time collaboration module, AI insights dashboard, and mobile application navigation overhaul. The team aligned on timelines, ownership, and cross-functional dependencies across engineering, design, product, and customer success.",
            "key_topics": ["Real-time Collaboration Module", "AI Insights Dashboard", "Mobile UX Overhaul", "Q3 Timeline Planning", "Enterprise Customer Needs", "Infrastructure Scaling"],
            "chapters": [
                {"title": "Real-time Collaboration Module", "timestamp": 22.5, "description": "Priority one feature with 6-8 week engineering estimate, covering WebSocket implementation and presence indicators"},
                {"title": "AI Insights Dashboard", "timestamp": 229.2, "description": "Six-week timeline for ML models and visualization layer to surface user behavior patterns and churn signals"},
                {"title": "Mobile Navigation Overhaul", "timestamp": 438.8, "description": "Focus on three key mobile flows representing 78% of sessions, with a dedicated hackathon planned"},
                {"title": "Action Items & Wrap-up", "timestamp": 599.0, "description": "Summary of commitments and cross-platform design consistency requirements"}
            ]
        },
        "action_items": [
            {"text": "Michael to prepare detailed engineering sprint breakdown for collaboration module", "assignee": "Michael Torres", "due_date": "2026-07-25", "completed": False},
            {"text": "Priya to coordinate design handoffs with James for sprint planning", "assignee": "Priya Nair", "due_date": "2026-07-26", "completed": False},
            {"text": "Rachel to identify 10-15 beta customers for AI Insights dashboard launch", "assignee": "Rachel Green", "due_date": "2026-07-28", "completed": True},
            {"text": "Tom to provision dedicated inference clusters for ML model serving", "assignee": "Tom Walsh", "due_date": "2026-08-01", "completed": False},
            {"text": "Priya to prepare low-fidelity navigation specs for mobile hackathon", "assignee": "Priya Nair", "due_date": "2026-07-25", "completed": False},
            {"text": "James and Priya to schedule cross-platform design consistency sync", "assignee": "James Okafor", "due_date": "2026-07-29", "completed": False},
        ]
    },
    {
        "title": "Sales Pipeline Weekly Sync",
        "date": datetime.now() - timedelta(days=1, hours=5),
        "duration_seconds": 1920,
        "host": "Marcus Johnson",
        "participants": ["Marcus Johnson", "Lisa Park", "Ahmed Hassan", "Sophia Rodriguez"],
        "thumbnail_color": "#0ea5e9",
        "channel": "My Meetings",
        "tags": ["sales", "pipeline", "weekly"],
        "transcript": [
            (0.0, 12.3, "Marcus Johnson", "Hey team, good to see everyone. Let's do our weekly pipeline review. Lisa, can you kick us off with the overview?"),
            (12.8, 32.4, "Lisa Park", "Sure Marcus. So we have 47 active opportunities in the pipeline right now totaling about 2.3 million in potential ARR. Of those, 12 are in late stages and we're expecting to close at least 8 this quarter."),
            (33.0, 52.6, "Marcus Johnson", "That's strong. What's our confidence on those 8 deals? Any red flags we should know about?"),
            (53.2, 75.4, "Ahmed Hassan", "Three of them I'd flag as at risk. Acme Corp is going through a procurement freeze, TechStart has been non-responsive for two weeks, and GlobalSoft is re-evaluating their budget due to some internal restructuring."),
            (76.0, 95.3, "Sophia Rodriguez", "I've been working the Acme Corp account. I spoke with their VP yesterday and confirmed the freeze is temporary — expected to lift in the next three weeks. They're still very interested and we're positioned well."),
            (95.8, 118.4, "Marcus Johnson", "That's good news on Acme. Ahmed, for TechStart — have we tried reaching them through different channels? Sometimes these go quiet because the champion has changed."),
            (119.0, 138.7, "Ahmed Hassan", "Good point. I'll check with our contact on LinkedIn and see if there's been any org change. I can also reach out to their CTO who we met at the conference last month."),
            (139.3, 158.5, "Lisa Park", "For GlobalSoft, I'd recommend we offer a flexible payment structure. They're budget-constrained but genuinely want the solution. If we can spread the payment across two quarters it might unlock the deal."),
            (159.0, 178.2, "Marcus Johnson", "Let's get finance to model that out. I want to make sure we're not creating cash flow issues on our end but it's worth exploring. Sophia, can you loop in finance today?"),
            (178.8, 192.4, "Sophia Rodriguez", "Will do. I'll have a proposal ready by tomorrow afternoon."),
            (193.0, 212.6, "Marcus Johnson", "Great. Now let's talk about new opportunities. What's coming into the top of funnel this week?"),
            (213.2, 235.4, "Lisa Park", "We have 15 new MQLs from the webinar we hosted last Tuesday. Of those, I've qualified 7 as strong prospects. The other 8 need more qualification. I'll be running discovery calls through Thursday."),
            (236.0, 255.7, "Ahmed Hassan", "We also got three inbound requests from the G2 reviews that went live last week. Those tend to be high intent so I'd prioritize those."),
            (256.3, 275.5, "Sophia Rodriguez", "I'm working on a referral from DataCorp that could be a significant enterprise deal — potentially 200K ARR. I have an intro call scheduled for Friday."),
            (276.0, 295.8, "Marcus Johnson", "Sophia that's exciting. Please send me the prep deck before Friday. I want to make sure we put our best foot forward on that one."),
            (296.4, 315.6, "Sophia Rodriguez", "Absolutely. I'll have it ready by Thursday morning for your review."),
            (316.2, 335.4, "Marcus Johnson", "Let's also make sure we follow up on the conference leads from last month. How many of those are still outstanding, Lisa?"),
            (336.0, 355.7, "Lisa Park", "I have 22 conference leads that haven't been fully qualified. I'll do a blitz on those this week and add qualified ones to the pipeline by Friday."),
            (356.3, 375.5, "Marcus Johnson", "Perfect. Let's wrap up. This week's priority actions — Ahmed fix the TechStart situation, Sophia handle the GlobalSoft payment proposal and prep for DataCorp, Lisa qualify the conference leads and MQLs. Any questions?"),
            (376.0, 385.3, "Ahmed Hassan", "No questions, clear action items. Thanks Marcus."),
            (385.8, 392.1, "Marcus Johnson", "Excellent. Talk to you all next week. Let's close some deals!"),
        ],
        "summary": {
            "overview": "The weekly sales pipeline sync covered a 47-opportunity pipeline worth 2.3M ARR, with 3 at-risk deals (Acme Corp, TechStart, GlobalSoft) requiring immediate attention. New top-of-funnel activities included 15 webinar MQLs, 3 G2 review inbounds, and a high-potential 200K enterprise referral.",
            "key_topics": ["Pipeline Health Review", "At-Risk Deal Management", "New Opportunity Intake", "Enterprise Referral - DataCorp"],
            "chapters": [
                {"title": "Pipeline Overview", "timestamp": 0.0, "description": "47 active opportunities, 2.3M ARR potential, 8 expected closes this quarter"},
                {"title": "At-Risk Deal Analysis", "timestamp": 53.2, "description": "Three deals flagged: Acme Corp (procurement freeze), TechStart (non-responsive), GlobalSoft (budget restructuring)"},
                {"title": "New Opportunities", "timestamp": 193.0, "description": "15 webinar MQLs, 3 G2 inbounds, and 200K ARR enterprise referral from DataCorp"},
                {"title": "Action Items", "timestamp": 356.3, "description": "Priority tasks assigned across the sales team for the week"}
            ]
        },
        "action_items": [
            {"text": "Ahmed to reach out to TechStart CTO via LinkedIn and alternative channels", "assignee": "Ahmed Hassan", "due_date": "2026-08-14", "completed": False},
            {"text": "Sophia to coordinate with finance on GlobalSoft flexible payment proposal", "assignee": "Sophia Rodriguez", "due_date": "2026-08-13", "completed": True},
            {"text": "Sophia to prepare DataCorp discovery call deck for Marcus review", "assignee": "Sophia Rodriguez", "due_date": "2026-08-14", "completed": False},
            {"text": "Lisa to qualify 22 conference leads and add to pipeline by Friday", "assignee": "Lisa Park", "due_date": "2026-08-15", "completed": False},
            {"text": "Lisa to run discovery calls on 15 webinar MQLs this week", "assignee": "Lisa Park", "due_date": "2026-08-15", "completed": False},
        ]
    },
    {
        "title": "Engineering Standup — Sprint 42",
        "date": datetime.now() - timedelta(hours=6),
        "duration_seconds": 1350,
        "host": "James Okafor",
        "participants": ["James Okafor", "Kenji Tanaka", "Fatima Al-Rashid", "Marco Bianchi", "Nina Volkov", "Chris Park"],
        "thumbnail_color": "#10b981",
        "channel": "All Meetings",
        "tags": ["engineering", "standup", "sprint"],
        "transcript": [
            (0.0, 9.4, "James Okafor", "Good morning team. Let's do our daily standup. Kenji, you're first. What did you do yesterday, what are you doing today, and any blockers?"),
            (10.0, 35.6, "Kenji Tanaka", "Yesterday I finished the WebSocket connection manager refactor. Today I'm starting on the presence tracking system. No blockers at the moment but I'll need Fatima's design specs for the presence indicators by end of day."),
            (36.2, 52.4, "Fatima Al-Rashid", "Sure Kenji, I'll send those to you by 2pm. Yesterday I completed the collaboration UI mockups and today I'm working on the conflict resolution UI patterns."),
            (53.0, 68.7, "Marco Bianchi", "Yesterday I was debugging the authentication sync issue in staging. Found the root cause — it was a race condition in the token refresh logic. Today I'm implementing the fix and writing tests."),
            (69.3, 85.5, "James Okafor", "Marco, is that fix going to be ready for deployment today? We have the customer demo tomorrow and we need staging to be clean."),
            (86.1, 102.4, "Marco Bianchi", "Should be ready by 4pm. I'll notify the team once it's deployed to staging and we can do a quick verification before EOD."),
            (103.0, 118.6, "Nina Volkov", "Yesterday I completed the performance optimization work on the data fetching layer. Reduced average query time by 40%. Today I'm documenting the changes and starting on the caching strategy for the AI dashboard."),
            (119.2, 136.5, "Chris Park", "Yesterday I set up the CI/CD pipeline for the mobile apps. iOS build times are now down from 18 minutes to 9 minutes. Today I'm working on the Android pipeline and also reviewing PRs."),
            (137.1, 155.4, "James Okafor", "Excellent work on the build time reduction Chris. That's a huge developer experience improvement. Any blockers across the team on either of those?"),
            (156.0, 172.6, "Kenji Tanaka", "I could use some clarification on the reconnection strategy when a WebSocket connection drops. Should we have exponential backoff or a fixed interval?"),
            (173.2, 192.5, "James Okafor", "Let's go with exponential backoff with a maximum of 30 seconds. I'll add that as a config constant in the shared configuration module so it's easy to tune."),
            (193.1, 210.4, "Marco Bianchi", "Also, I want to flag that the test coverage on the authentication module is at 61%. Before the sprint closes we should aim for at least 80%. I can help with that once my current fix is merged."),
            (211.0, 228.7, "Fatima Al-Rashid", "I have a request — can we schedule a short design sync this week to review the mobile navigation prototype? I want to make sure the hand-off to engineering is smooth before the hackathon."),
            (229.3, 245.6, "James Okafor", "Absolutely. Let's do Thursday at 3pm. Chris, can you join too since you're handling the mobile CI pipeline?"),
            (246.2, 255.4, "Chris Park", "That works for me."),
            (256.0, 272.7, "James Okafor", "Great. Anything else? Any risks to the sprint goals we should surface now?"),
            (273.3, 292.5, "Nina Volkov", "One potential risk — the ML model serving infrastructure won't be available until next week. This might delay the AI dashboard work if we need the model endpoints to integrate the frontend visualization layer."),
            (293.1, 312.4, "James Okafor", "Good flag Nina. Let's use mock data for the frontend in the meantime. That way the UI work can proceed independently and we'll swap in the real endpoints when infrastructure is ready."),
            (313.0, 328.6, "Kenji Tanaka", "Good call. I'll create a mock data generator module that the frontend team can use. Should take me a couple of hours today."),
            (329.2, 345.5, "James Okafor", "Perfect. Anything else? No? Great standup everyone. Let's have a productive day."),
        ],
        "summary": {
            "overview": "Sprint 42 standup covered feature progress across WebSocket collaboration, authentication fixes, performance optimization, and mobile CI/CD improvements. Key decisions made on WebSocket reconnection strategy and mock data approach to unblock AI dashboard frontend work.",
            "key_topics": ["WebSocket Presence Tracking", "Authentication Bug Fix", "Performance Optimization", "Mobile CI/CD Pipeline", "AI Dashboard Unblocking"],
            "chapters": [
                {"title": "Individual Updates", "timestamp": 0.0, "description": "Team members share yesterday's progress and today's focus across 6 concurrent workstreams"},
                {"title": "Blockers & Decisions", "timestamp": 156.0, "description": "WebSocket reconnection strategy decided: exponential backoff with 30s max"},
                {"title": "Risk Identification", "timestamp": 256.0, "description": "ML infrastructure delay addressed by using mock data to unblock frontend development"}
            ]
        },
        "action_items": [
            {"text": "Fatima to send presence indicator specs to Kenji by 2pm", "assignee": "Fatima Al-Rashid", "due_date": "2026-08-13", "completed": True},
            {"text": "Marco to deploy auth fix to staging by 4pm and notify team", "assignee": "Marco Bianchi", "due_date": "2026-08-13", "completed": False},
            {"text": "Kenji to create mock data generator module for AI dashboard", "assignee": "Kenji Tanaka", "due_date": "2026-08-13", "completed": False},
            {"text": "James to add reconnection config constant to shared config module", "assignee": "James Okafor", "due_date": "2026-08-13", "completed": False},
            {"text": "Marco to increase auth module test coverage to 80%", "assignee": "Marco Bianchi", "due_date": "2026-08-17", "completed": False},
        ]
    },
    {
        "title": "Customer Success Interview — Horizon Analytics",
        "date": datetime.now() - timedelta(days=5),
        "duration_seconds": 3300,
        "host": "Rachel Green",
        "participants": ["Rachel Green", "Daniel Cho", "Paul Martinez"],
        "thumbnail_color": "#f59e0b",
        "channel": "All Meetings",
        "tags": ["customer", "interview", "feedback"],
        "transcript": [
            (0.0, 14.3, "Rachel Green", "Daniel, Paul, thank you so much for taking the time today. I'm really looking forward to hearing your experience with our platform. Shall we start with an overview of how Horizon has been using it?"),
            (14.8, 42.5, "Daniel Cho", "Absolutely Rachel. It's been about eight months since we onboarded. We started with the data analytics module and then expanded to include the reporting and workflow automation features about four months in."),
            (43.1, 65.4, "Paul Martinez", "And from an end-user perspective, the adoption has been really strong. We went from 12 active users to over 80 in the first six months. People genuinely like using it which is rare for enterprise software."),
            (66.0, 85.7, "Rachel Green", "That's really great to hear. What would you say has been the single most impactful feature for your team?"),
            (86.3, 115.6, "Daniel Cho", "Without question, the automated report generation. Before, our analysts were spending 6-8 hours every week manually compiling reports for stakeholders. Now it's completely automated and they get more time for actual analysis."),
            (116.2, 138.5, "Paul Martinez", "I'd add the dashboard customization. Different teams have very different needs and being able to configure the dashboard for each department made adoption so much smoother. Sales sees their metrics, engineering sees theirs."),
            (139.1, 162.4, "Rachel Green", "That's fantastic feedback. Now, I also wanted to make sure we talk about any pain points or areas where we could do better. Please be honest — this really helps us improve."),
            (163.0, 195.7, "Daniel Cho", "Okay, I'll be direct. The data export functionality has some limitations that frustrate our team. We can export to CSV and PDF but we really need native Excel export with formulas intact. We've had to build workarounds for this."),
            (196.3, 218.6, "Paul Martinez", "The search functionality could also use improvement. When we're searching across a large dataset with thousands of rows, the results are sometimes inconsistent and the filters don't always behave as expected."),
            (219.2, 242.5, "Rachel Green", "Both of those are really important feedback points. I want to be transparent — the Excel export is on our roadmap for Q3 and the search improvements are in active development. I'll make sure your account gets early access to those features."),
            (243.1, 268.4, "Daniel Cho", "That would be great. One more thing — the onboarding documentation. When we were setting up the workflow automation, the documentation was difficult to follow. Some of the steps were outdated and didn't match the current interface."),
            (269.0, 292.7, "Rachel Green", "I completely understand that frustration. We've been doing a major documentation overhaul and it should be complete by end of month. Would you like me to connect you with our technical writer to review the automation section specifically?"),
            (293.3, 308.6, "Daniel Cho", "That would actually be really helpful. Yes please."),
            (309.2, 335.5, "Paul Martinez", "Can I also bring up the mobile experience? Our executives want to check dashboards on mobile but the current mobile app is quite limited. Full-featured mobile access would be really valuable for us."),
            (336.1, 358.4, "Rachel Green", "The mobile experience is one of our top priorities for Q3 actually. We're doing a significant overhaul of the mobile app with native interactions and improved dashboard access. I'd love to include Horizon as one of our beta testers."),
            (359.0, 378.7, "Paul Martinez", "That sounds great. We'd definitely be interested in beta testing."),
            (379.3, 402.6, "Rachel Green", "Perfect. Let me also ask — when it comes to your renewal coming up in Q4, are there specific features or improvements that would make the decision easier for you?"),
            (403.2, 428.5, "Daniel Cho", "Honestly the Excel export and improved search are the biggest ones. If those are delivered before our renewal, it'll be a very easy decision to renew and potentially expand our license."),
            (429.1, 452.4, "Paul Martinez", "And if the mobile improvements are available, we'd likely look at expanding from our current 80 users to potentially 150 or more. A lot of our remote teams are mobile-first."),
            (453.0, 478.7, "Rachel Green", "This is incredibly valuable. Let me commit to a few things — I'll personally track the Excel export and search improvements and notify you the moment they're in private beta. And I'll add Horizon to the mobile beta program today."),
            (479.3, 502.6, "Daniel Cho", "Thank you Rachel. And I want to say — the level of support we get from your team is genuinely one of the reasons we stay. Having responsive, knowledgeable people who actually listen makes a big difference."),
            (503.2, 525.5, "Rachel Green", "That means the world to us Daniel. Thank you both so much. I'll send a follow-up email with everything we discussed and the commitments I've made. Enjoy the rest of your week!"),
        ],
        "summary": {
            "overview": "Customer success interview with Horizon Analytics revealed strong adoption growth (12 to 80 users in 6 months), key value drivers in automated reporting and dashboard customization, and actionable feedback on Excel export limitations, search inconsistencies, and outdated documentation. Strong expansion signals tied to Q3 feature delivery.",
            "key_topics": ["Product Adoption Success", "Pain Points: Export & Search", "Documentation Issues", "Mobile App Feedback", "Q4 Renewal Discussion", "Expansion Opportunity"],
            "chapters": [
                {"title": "Usage Overview & Success Stories", "timestamp": 0.0, "description": "8-month customer, 12 to 80 user growth, automated reporting as top value driver"},
                {"title": "Pain Points & Feedback", "timestamp": 139.1, "description": "Excel export limitations, search inconsistency, outdated automation documentation"},
                {"title": "Mobile & Expansion Discussion", "timestamp": 309.2, "description": "Mobile overhaul beta interest, potential expansion from 80 to 150 users"},
                {"title": "Renewal & Commitments", "timestamp": 379.3, "description": "QR tied to Excel export and search features, beta access commitments made"}
            ]
        },
        "action_items": [
            {"text": "Rachel to add Horizon to mobile beta program", "assignee": "Rachel Green", "due_date": "2026-08-08", "completed": True},
            {"text": "Rachel to connect Daniel with technical writer for automation documentation review", "assignee": "Rachel Green", "due_date": "2026-08-09", "completed": True},
            {"text": "Rachel to track Excel export and search beta status and notify Horizon", "assignee": "Rachel Green", "due_date": "2026-08-30", "completed": False},
            {"text": "Rachel to send follow-up email with commitments from this call", "assignee": "Rachel Green", "due_date": "2026-08-08", "completed": True},
        ]
    },
    {
        "title": "Marketing Campaign Brainstorm — Q4 Launch",
        "date": datetime.now() - timedelta(days=3, hours=2),
        "duration_seconds": 2280,
        "host": "Alex Rivera",
        "participants": ["Alex Rivera", "Mia Thompson", "Jordan Lee", "Sam Patel", "Chris Morgan"],
        "thumbnail_color": "#ec4899",
        "channel": "My Meetings",
        "tags": ["marketing", "campaign", "q4"],
        "transcript": [
            (0.0, 12.6, "Alex Rivera", "Alright everyone, exciting session today. We're brainstorming our Q4 campaign strategy and I want big, creative ideas on the table. No idea is too crazy. Mia, let's start — what's your read on the market right now?"),
            (13.2, 38.5, "Mia Thompson", "So the market is really primed for authenticity. There's a lot of fatigue with polished corporate marketing. Brands that are showing real stories, real customers, real outcomes are seeing much better engagement right now."),
            (39.1, 62.4, "Jordan Lee", "Totally agree. I've been looking at competitor campaigns and the ones that are winning are built around user-generated content and community stories. Less about features, more about transformation."),
            (63.0, 86.7, "Sam Patel", "From a data perspective, our most shared and engaged content over the last six months has been the customer case studies. The one we did with TechNova got 3x more engagement than our standard feature announcements."),
            (87.3, 112.6, "Alex Rivera", "That's a really strong signal. So what if Q4 is centered around a 'Real Stories' campaign? Authentic customer voices, video testimonials, before-and-after transformation narratives?"),
            (113.2, 138.5, "Mia Thompson", "I love that direction. We could call it 'Built on Real Results' or something similar. Feature a customer a week through November with full video stories — their challenge, their journey, their outcome."),
            (139.1, 162.4, "Chris Morgan", "We could pair that with a LinkedIn campaign where we amplify each customer's story and have their employees share it organically. That would extend our reach significantly into their networks."),
            (163.0, 188.7, "Jordan Lee", "And tie it to a hashtag campaign. Something like '#RealResults' where customers can share their own wins using our platform. User-generated content that builds social proof organically."),
            (189.3, 214.6, "Sam Patel", "For the paid amplification, we should put significant budget behind the best performing stories. If a video gets strong organic engagement first, that's our signal to amplify it with paid social."),
            (215.2, 238.5, "Alex Rivera", "I'm really excited about this direction. Let's also think about the product launch angle — we have the collaboration module and AI insights dashboard both dropping in Q3. How do we tie those into the Q4 campaign?"),
            (239.1, 264.4, "Mia Thompson", "Perfect timing actually. We can feature the new collaboration stories — customers who are using the new features to transform how their teams work. It's a natural narrative bridge from product launch to customer benefit."),
            (265.0, 288.7, "Jordan Lee", "We could run a beta customer spotlight series leading up to the full launch. Give beta customers early exposure and build anticipation with 'coming soon' teaser content in October."),
            (289.3, 312.6, "Chris Morgan", "I'd also suggest we think about an event play for Q4. A virtual summit or webinar series where customers share their stories live would be powerful and generate a ton of content we can repurpose afterward."),
            (313.2, 338.5, "Alex Rivera", "A virtual customer summit sounds incredible. What format are you thinking Chris?"),
            (339.1, 365.4, "Chris Morgan", "I'm thinking a half-day event in November with a keynote, three customer panels, and product demos of the new features. We could target 500 to 1000 registrants and have a significant media moment."),
            (366.0, 390.7, "Sam Patel", "From a budget perspective, if we remove the trade show allocation — we decided to skip two conferences this Q4 — we'd have about 150K to allocate to this campaign. That's plenty for a solid customer story campaign plus a virtual event."),
            (391.3, 416.6, "Mia Thompson", "And we should think about the content machine this creates. Each customer story is a video, a blog post, a LinkedIn article, social cards, email newsletter content, and sales enablement material. The ROI on producing high-quality stories is exceptional."),
            (417.2, 442.5, "Jordan Lee", "Agreed. The production investment pays dividends across every channel. And if we do this right, customers will want to participate because we're celebrating them. It's a win-win."),
            (443.1, 465.4, "Alex Rivera", "Love it. Let's make this happen. Here's how I see the timeline — identify 8 to 10 customer story candidates in August, produce stories in September, launch the campaign in October, and culminate with the virtual summit in November."),
            (466.0, 488.7, "Mia Thompson", "That timeline works. August is customer identification and outreach, September is production month, October is the launch with weekly story drops, and November is the summit and campaign climax."),
            (489.3, 512.6, "Sam Patel", "Who owns what? Alex, should you take the overall campaign ownership? Mia on content production, Jordan on social strategy, Chris on the event, and me on analytics and paid amplification?"),
            (513.2, 532.5, "Alex Rivera", "Perfect distribution Sam. Let's run with that. Everyone start by putting together a one-pager on your area by next Friday. We'll reconvene then and start building the full brief."),
            (533.1, 548.4, "Chris Morgan", "Sounds great. I'm really excited about the virtual summit concept. I think this could be one of our best campaigns."),
            (549.0, 562.3, "Alex Rivera", "Me too. Alright team, Q4 is going to be incredible. Let's go build something real."),
        ],
        "summary": {
            "overview": "The Q4 marketing campaign brainstorm established a 'Real Stories / Real Results' campaign strategy anchored by authentic customer transformation narratives, a weekly customer story spotlight program, and a virtual customer summit in November. Budget allocation of 150K from reallocated trade show funding approved.",
            "key_topics": ["Real Results Campaign Strategy", "Customer Story Program", "Virtual Summit Planning", "Social & LinkedIn Strategy", "Product Launch Integration", "Budget & Timeline"],
            "chapters": [
                {"title": "Market & Opportunity Analysis", "timestamp": 0.0, "description": "Market fatigue with polished content; user-generated and authentic stories outperforming 3x"},
                {"title": "Campaign Concept Development", "timestamp": 87.3, "description": "'Built on Real Results' concept — weekly customer spotlights tied to Q3 product launches"},
                {"title": "Virtual Summit Concept", "timestamp": 289.3, "description": "Half-day November event with customer panels, product demos, targeting 500-1000 registrants"},
                {"title": "Execution Plan", "timestamp": 443.1, "description": "Aug: identify stories, Sep: produce, Oct: launch, Nov: summit — 150K budget confirmed"}
            ]
        },
        "action_items": [
            {"text": "Alex to identify 8-10 customer story candidates for the campaign", "assignee": "Alex Rivera", "due_date": "2026-08-31", "completed": False},
            {"text": "Mia to create content production plan and templates for customer stories", "assignee": "Mia Thompson", "due_date": "2026-08-20", "completed": False},
            {"text": "Jordan to develop social strategy and hashtag campaign proposal", "assignee": "Jordan Lee", "due_date": "2026-08-20", "completed": False},
            {"text": "Chris to build out virtual summit proposal with venue/platform options", "assignee": "Chris Morgan", "due_date": "2026-08-20", "completed": False},
            {"text": "Sam to create paid amplification strategy and budget breakdown", "assignee": "Sam Patel", "due_date": "2026-08-20", "completed": False},
            {"text": "Everyone to submit one-pager on their campaign area by next Friday", "assignee": "All", "due_date": "2026-08-20", "completed": False},
        ]
    },
]


def seed_database():
    create_tables()
    db = SessionLocal()

    # Check if already seeded
    if db.query(Meeting).count() > 0:
        print("Database already seeded. Skipping.")
        db.close()
        return

    try:
        for data in MEETINGS_DATA:
            # Create meeting
            meeting = Meeting(
                title=data["title"],
                date=data["date"],
                duration_seconds=data["duration_seconds"],
                host=data["host"],
                participants=json.dumps(data["participants"]),
                thumbnail_color=data["thumbnail_color"],
                channel=data["channel"],
                status="completed",
            )
            db.add(meeting)
            db.flush()

            # Create transcript lines
            for start, end, speaker, text in data["transcript"]:
                line = TranscriptLine(
                    meeting_id=meeting.id,
                    speaker=speaker,
                    text=text,
                    start_time=start,
                    end_time=end,
                )
                db.add(line)

            # Create summary
            summary_data = data["summary"]
            summary = Summary(
                meeting_id=meeting.id,
                overview=summary_data["overview"],
                key_topics=json.dumps(summary_data["key_topics"]),
                chapters=json.dumps(summary_data["chapters"]),
            )
            db.add(summary)

            # Create action items
            for ai_data in data["action_items"]:
                action_item = ActionItem(
                    meeting_id=meeting.id,
                    text=ai_data["text"],
                    assignee=ai_data.get("assignee"),
                    due_date=ai_data.get("due_date"),
                    completed=ai_data.get("completed", False),
                )
                db.add(action_item)

            # Create tags
            for tag in data.get("tags", []):
                meeting_tag = MeetingTag(meeting_id=meeting.id, tag=tag)
                db.add(meeting_tag)

        db.commit()
        print(f"Successfully seeded {len(MEETINGS_DATA)} meetings with full transcripts, summaries, and action items.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
