import React from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/context/AppContext";
import { StaffShell } from "@/components/Shell";
import { PupilShell } from "@/components/PupilShell";
import { Loading } from "@/components/common";

import SignIn from "@/pages/SignIn";
import Today from "@/pages/Today";
import Timetable from "@/pages/Timetable";
import MorningMeeting from "@/pages/MorningMeeting";
import Communication from "@/pages/Communication";
import Interaction from "@/pages/Interaction";
import Regulation from "@/pages/Regulation";
import BrainBreaks from "@/pages/BrainBreaks";
import Watch from "@/pages/Watch";
import PrepareMe from "@/pages/PrepareMe";
import Jobs from "@/pages/Jobs";
import Pickers from "@/pages/Pickers";
import Pupils from "@/pages/Pupils";
import PupilProfile from "@/pages/PupilProfile";
import Observations from "@/pages/Observations";
import Progress from "@/pages/Progress";
import Sparks from "@/pages/Sparks";
import Projects from "@/pages/Projects";
import Mainstream from "@/pages/Mainstream";
import Settings from "@/pages/Settings";
import PupilMode from "@/pages/PupilMode";

function Shell() {
  const { user, booting, pupilMode } = useApp();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading label="Opening the classroom" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    );
  }

  if (pupilMode) {
    return (
      <PupilShell>
        <Routes>
          <Route path="/pupil" element={<PupilMode view="now" />} />
          <Route path="/pupil/day" element={<PupilMode view="day" />} />
          <Route path="/pupil/talk" element={<PupilMode view="talk" />} />
          <Route path="/pupil/feel" element={<PupilMode view="feel" />} />
          <Route path="/pupil/watch" element={<PupilMode view="watch" />} />
          <Route path="/pupil/breaks" element={<PupilMode view="breaks" />} />
          <Route path="/pupil/sparks" element={<PupilMode view="sparks" />} />
          <Route path="*" element={<Navigate to="/pupil" replace />} />
        </Routes>
      </PupilShell>
    );
  }

  return (
    <StaffShell>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/morning-meeting" element={<MorningMeeting />} />
        <Route path="/communication" element={<Communication />} />
        <Route path="/interaction" element={<Interaction />} />
        <Route path="/regulation" element={<Regulation />} />
        <Route path="/brain-breaks" element={<BrainBreaks />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/prepare-me" element={<PrepareMe />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/pickers" element={<Pickers />} />
        <Route path="/pupils" element={<Pupils />} />
        <Route path="/pupils/:pupilId" element={<PupilProfile />} />
        <Route path="/observations" element={<Observations />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/sparks" element={<Sparks />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/mainstream" element={<Mainstream />} />
        <Route path="/mainstream/:pupilId" element={<Mainstream />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/sign-in" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StaffShell>
  );
}

export default function App() {
  return (
    <div className="App">
      <AppProvider>
        <BrowserRouter>
          <Shell />
          <Toaster position="bottom-right" closeButton />
        </BrowserRouter>
      </AppProvider>
    </div>
  );
}
