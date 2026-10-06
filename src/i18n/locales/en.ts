// Canonical English string table. ALL other locale files must satisfy this
// shape — TypeScript will flag missing keys.
//
// Naming convention: dot-namespaced by area (onboarding, profile, home, ...).
// Use {var} placeholders for parameters; the t() runtime substitutes them.

export const en = {
  // ─── common ─────────────────────────────────────────────────────────────
  "common.cancel": "Cancel",
  "common.done": "Done",
  "common.continue": "Continue",
  "common.next": "Next",
  "common.skip": "Skip",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.change": "Change",
  "common.add": "Add",
  "common.get_started": "Get started",
  "common.switch": "Switch",
  "common.permission_needed": "Permission needed",
  "common.permission_body": "Please allow notifications in Settings to receive pickup reminders.",

  // ─── language picker (sheet + onboarding) ───────────────────────────────
  "language_picker.title": "Language",
  "language_picker.body": "Pick the language Abfall speaks to you in.",
  "language.en": "English",
  "language.de": "German",
  "language.fr": "French",
  "language.it": "Italian",

  // ─── onboarding ─────────────────────────────────────────────────────────
  "onboarding.language.title": "Choose your language",
  "onboarding.language.body": "Pick the language Abfall speaks to you in. You can change it any time from your profile.",
  "onboarding.scan.title": "Scan your paper calendar",
  "onboarding.scan.body": "Take a photo of your local waste calendar. Abfall reads every pickup and builds a clean digital version in your language.",
  "onboarding.community.title": "Or borrow one nearby",
  "onboarding.community.body": "Skip the scanning. Browse calendars others have already shared for your area, and share yours back so the next neighbor doesn't have to.",
  "onboarding.reminders.title": "Never miss a pickup",
  "onboarding.reminders.body": "Get nudged the day before, the morning of, or any time you choose. Toggle what you want, ignore what you don't.",
  "onboarding.map.title": "Find drop-offs nearby",
  "onboarding.map.body": "See nearby paper, glass, and bulky-waste collection points filtered by what you need. Directions are one tap away.",
  "onboarding.welcome.title": "You're all set",
  "onboarding.welcome.body": "Scan your calendar, set a reminder, and let Abfall handle the rest. Welcome aboard. Your recycling routine just got a lot easier.",
  "onboarding.welcome.ready": "READY TO GO",

  // ─── profile ────────────────────────────────────────────────────────────
  "profile.version": "Version {version}",
  "profile.preferences": "PREFERENCES",
  "profile.data_privacy": "DATA & PRIVACY",
  "profile.language_row": "Language",
  "profile.replay_onboarding": "Replay onboarding",
  "profile.replay_onboarding_desc": "Show the welcome screens again on next launch.",
  "profile.clear_calendars": "Clear all calendars",
  "profile.clear_calendars_desc": "Removes saved calendars and cancels scheduled reminders.",
  "profile.reset_everything": "Reset everything",
  "profile.reset_everything_desc": "Calendars, reminders, and onboarding flag — a clean slate.",
  "profile.data_note": "All data lives locally on this device. Nothing is sent to any server unless you explicitly share a calendar.",
  "profile.confirm.replay.title": "Replay onboarding?",
  "profile.confirm.replay.body": "The welcome screens will appear again the next time you open Abfall. Your calendars and reminders stay intact.",
  "profile.confirm.replay.label": "Replay",
  "profile.confirm.clear.title": "Clear all calendars?",
  "profile.confirm.clear.body": "This removes every saved calendar and cancels all scheduled notifications. You'll need to scan or import again.",
  "profile.confirm.clear.label": "Clear calendars",
  "profile.confirm.reset.title": "Reset everything?",
  "profile.confirm.reset.body": "Removes calendars, cancels reminders, and forgets that you've seen the onboarding. Restart the app afterwards to see the welcome flow again.",
  "profile.confirm.reset.label": "Reset all",
  "profile.toast.replay": "Onboarding reset · restart the app",
  "profile.toast.cleared": "All calendars cleared",
  "profile.toast.reset": "All data cleared · restart the app",

  // ─── destination picker ────────────────────────────────────────────────
  "destination_picker.title": "Deliver reminders to",
  "destination_picker.body": "Pick one. Switching cleans up the others — you'll never get the same reminder twice.",
  "destination.abfall.label": "Inside Abfall",
  "destination.abfall.desc": "Get push notifications from the app itself.",
  "destination.phone.label": "Phone calendar",
  "destination.phone.desc": "Pickups appear on your iOS / Android calendar with alarms.",
  "destination.google.label": "Google Calendar",
  "destination.google.desc": "Pushes events to your Google account; alarms set there.",
  "destination.none.label": "No reminders",

  // ─── home ───────────────────────────────────────────────────────────────
  "home.calendar": "CALENDAR",
  "home.switch": "Switch",
  "home.edit_banner": "Editing pickups — tap any day to add or remove.",
  "home.nudge_title": "Get a heads-up before pickup",
  "home.nudge_body": "Set up reminders so you never wheel the bin out late.",
  "home.next_up": "NEXT UP",
  "home.today": "TODAY",
  "home.tomorrow": "TOMORROW",
  "home.set_location": "Set location",
  "home.show_more": "Show {n} more days",
  "home.did_you_know": "DID YOU KNOW",
  "home.empty_hint": "Tap + to scan your first calendar",
  "home.toast.day_updated": "Day updated",
  "home.toast.saved": "Saved",
  "home.toast.updated": "Updated",
  "home.toast.no_match": "no match",

  // ─── reminders ──────────────────────────────────────────────────────────
  "reminders.notifications": "Notifications",
  "reminders.title_lead": "Stack your",
  "reminders.title_bold": "nudges",
  "reminders.subtitle": "Reminders are scheduled for your active calendar: {name}.",
  "reminders.delivered_via": "DELIVERED VIA",
  "reminders.all": "All",
  "reminders.section_all": "ALL · {n} REMINDERS",
  "reminders.section_all_one": "ALL · 1 REMINDER",
  "reminders.section_stream": "{name} · {n} REMINDERS",
  "reminders.section_stream_one": "{name} · 1 REMINDER",
  "reminders.empty_title": "No reminders yet",
  "reminders.empty_all": "Add one to get nudged before pickup days.",
  "reminders.empty_stream": "Add one to get nudged for {name} pickups.",
  "reminders.add": "Add a reminder",
  "reminders.no_upcoming": "No upcoming pickup",
  "reminders.upcoming_recurring": "{n} upcoming · next {when}",
  "reminders.upcoming_once": "Fires {when}",
  "reminders.at_time": "at {time}",
  "reminders.no_calendar_title": "No calendar selected",
  "reminders.no_calendar_body": "Add or activate a calendar in the Home tab to set up reminders.",
  "reminders.toast.removed": "Removed",
  "reminders.toast.on": "On · {when}",
  "reminders.toast.on_no_match": "On · no match",
  "reminders.toast.off": "Off",
  "reminders.toast.delivered_to": "Reminders via {dest}",
  "reminders.toast.google_failed": "Google sign-in failed · {error}",
  "reminders.toast.google_cancelled": "Google sign-in cancelled",

  // ─── recurrence "when" labels ──────────────────────────────────────────
  // These match the literal strings stored in ReminderRule.when so the
  // toggle/state logic still works — only the display layer translates.
  "when.morning_of": "Morning of",
  "when.evening_before": "Evening before",
  "when.day_before": "1 day before",
  "when.two_days_before": "2 days before",
  "when.specific_date": "Specific date",
} as const;

export type StringKey = keyof typeof en;
