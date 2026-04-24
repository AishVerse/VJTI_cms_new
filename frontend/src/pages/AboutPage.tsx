import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <div className="landing-page">
      {/* ── White Header ─────────────────────────────────────── */}
      <header className="landing-header" id="about-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo-link">
            <img
              src="/assets/vjti-logo-wide.png"
              alt="Veermata Jijabai Technological Institute"
              className="landing-logo-img"
            />
          </Link>
          <h1 className="landing-title">Campus Complaint Management System</h1>
          <Link to="/login" className="landing-login-btn" id="about-login-btn">
            Login
          </Link>
        </div>
      </header>

      {/* ── Red Navigation Bar ───────────────────────────────── */}
      <nav className="landing-nav" id="about-nav">
        <ul className="landing-nav-list">
          <li>
            <Link to="/" className="landing-nav-link">
              Home
            </Link>
          </li>
          <li>
            <Link to="/about" className="landing-nav-link landing-nav-link--active">
              About
            </Link>
          </li>
          <li>
            <Link to="/contact" className="landing-nav-link">
              Contact
            </Link>
          </li>
        </ul>
      </nav>

      {/* ── About Hero ──────────────────────────────────────── */}
      <section className="about-hero" id="about-hero">
        <div className="about-hero-overlay">
          <h1 className="about-hero-title">About VJTI</h1>
          <p className="about-hero-subtitle">
            A legacy of excellence since 1887
          </p>
        </div>
      </section>

      {/* ── About Content ───────────────────────────────────── */}
      <section className="about-content" id="about-content">
        <div className="about-content-inner">
          <div className="about-text-block">
            <h2 className="about-section-title">Our History</h2>
            <p className="about-para">
              Veermata Jijabai Technological Institute (VJTI), established in
              1887 as Victoria Jubilee Technical Institute, is one of the oldest
              engineering colleges in Asia. Located in Matunga, Mumbai, VJTI has
              been at the forefront of technical education in India for over 135
              years.
            </p>
            <p className="about-para">
              The institute was renamed in 1997 in honor of Veermata Jijabai,
              the mother of Chhatrapati Shivaji Maharaj. VJTI operates as an
              autonomous institution under the ownership of the Maharashtra
              State Government and is affiliated with the University of Mumbai.
            </p>
          </div>

          <div className="about-text-block">
            <h2 className="about-section-title">Academic Excellence</h2>
            <p className="about-para">
              The institute offers a diverse range of programs in engineering and
              technology spanning diploma, undergraduate, postgraduate, and
              doctoral levels. VJTI is renowned for its excellence in teaching,
              collaborative research endeavors, robust industry partnerships,
              and a vibrant alumni network.
            </p>
            <p className="about-para">
              VJTI stands as a beacon of quality education and innovation,
              producing engineers and technologists who have made significant
              contributions to India&apos;s technological and industrial
              development.
            </p>
          </div>

          <div className="about-text-block">
            <h2 className="about-section-title">Campus &amp; Infrastructure</h2>
            <p className="about-para">
              Spread across a large campus in the heart of Mumbai, VJTI boasts
              state-of-the-art laboratories, a well-stocked library, modern
              workshops, seminar halls, and sports facilities. The institute
              constantly upgrades its infrastructure to meet the evolving demands
              of engineering education and research.
            </p>
          </div>
        </div>
      </section>

      {/* ── Vision & Mission ─────────────────────────────────── */}
      <section className="landing-vm-section" id="about-vision-mission">
        {/* Vision */}
        <div className="landing-vm-card" id="about-vision">
          <div className="landing-vm-icon">
            <img src="/assets/vision-icon.png" alt="Vision" />
          </div>
          <div className="landing-vm-content">
            <h2 className="landing-vm-title">Vision</h2>
            <p className="landing-vm-text">
              To create a smart, transparent, and efficient digital platform for campus complaint 
              management that ensures timely resolution, accountability, and improved quality of 
              infrastructure and services at VJTI.
            </p>
          </div>
        </div>

        {/* Mission */}
        <div className="landing-vm-card" id="about-mission">
          <div className="landing-vm-icon">
            <img src="/assets/mission-icon.png" alt="Mission" />
          </div>
          <div className="landing-vm-content">
            <h2 className="landing-vm-title">Mission</h2>
            <p className="landing-vm-text">
             To provide a centralized system for students and faculty to register complaints and track them in real time.
             To streamline communication between complainants, department heads, and maintenance/housekeeping teams.
             To ensure faster response and resolution through structured workflows and accountability at every stage.
             To improve campus hygiene, safety, and infrastructure through data-driven insights and continuous monitoring.
             To build a transparent system where every complaint is tracked, verified, and properly closed with user confirmation.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="landing-footer">
        <p>
          &copy; {new Date().getFullYear()} Veermata Jijabai Technological
          Institute. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
