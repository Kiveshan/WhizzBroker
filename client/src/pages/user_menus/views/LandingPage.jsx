"use client";

import { useEffect, useState } from "react";
import Header from "../../../components/landingHeader";
import Modal from "../../../components/modal";
import Footer from "../../../components/Footer";
import "../css/index.css";
import { FiFileText, FiBookOpen, FiCheckCircle, FiActivity } from "react-icons/fi";
import api from "../../../api";

const dashboardData = [];

const LandingPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState("login");
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, new: 0, in_progress: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  const images = [
    "/images/landingpage/photo-1516216628859-9bccecab13ca.jpg",
    "/images/landingpage/blue-truck-rainy-highway-power-energy-motion.jpg",
    "/images/landingpage/container-operation-port-series.jpg",
    "/images/landingpage/logistic-center-with-colorful-storage-container.jpg",
    "/images/landingpage/truck-forest-road-moving-lorry-freight-transport-scene.jpg",
    "/images/landingpage/truck-vehicle-with-trailers-background.jpg",
    "/images/landingpage/pexels-1462751220-27732803.jpg",
    "/images/landingpage/pexels-chanaka-906494.jpg",
    "/images/landingpage/pexels-md-sihabul-islam-750002427-28185416.jpg",
    "/images/landingpage/pexels-tomfisk-2226458.jpg",
    "/images/landingpage/pexels-tomfisk-2231744.jpg",
    "/images/landingpage/semi-truck-carrying-blue-shipping-container.jpg",
    "/images/landingpage/shipping-containers-port-terminal.jpg",
    "/images/landingpage/transport-logistics-concept.jpg",
  ];
  const [baseImage, setBaseImage] = useState(images[0]);
  const [overlayImage, setOverlayImage] = useState(images[1] || images[0]);
  const [isCrossfading, setIsCrossfading] = useState(false);

  const handleLoginClick = () => {
    // If modal is already open, close it briefly before changing form
    if (isModalOpen && modalForm !== "login") {
      setIsModalOpen(false);
      setTimeout(() => {
        setModalForm("login");
        setIsModalOpen(true);
      }, 50);
    } else {
      setModalForm("login");
      setIsModalOpen(true);
    }
  };

  const handleRegisterClick = () => {
    // If modal is already open, close it briefly before changing form
    if (isModalOpen && modalForm !== "register") {
      setIsModalOpen(false);
      setTimeout(() => {
        setModalForm("register");
        setIsModalOpen(true);
      }, 50);
    } else {
      setModalForm("register");
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    // Disable page scroll only while on landing page
    document.body.classList.add("landing-no-scroll");
    return () => {
      document.body.classList.remove("landing-no-scroll");
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setFlipped((f) => !f), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    let idx = 1;
    let fadeTimeout;
    const interval = setInterval(() => {
      const next = images[idx % images.length];
      setOverlayImage(next);
      setIsCrossfading(true);

      fadeTimeout = setTimeout(() => {
        setBaseImage(next);
        setIsCrossfading(false);
      }, 3000);

      idx += 1;
    }, 7000);

    return () => {
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const res = await api.get("/api/landing/stats");
        const data = res.data || {};
        setStats({
          total: Number(data.total) || 0,
          completed: Number(data.completed) || 0,
          new: Number(data.new) || 0,
          in_progress: Number(data.in_progress) || 0,
        });
      } catch (e) {
        setStats({ total: 0, completed: 0, new: 0, in_progress: 0 });
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const CardFront1 = () => (
    <div className="stat-card-face">
      <div className="stat-icon"><FiFileText /></div>
      <div className="stat-texts">
        <span className="stat-title">Total Instructions</span>
        <span className="stat-number">{loadingStats ? "-" : stats.total}</span>
      </div>
    </div>
  );

  const CardBack1 = () => (
    <div className="stat-card-face">
      <div className="stat-icon success"><FiCheckCircle /></div>
      <div className="stat-texts">
        <span className="stat-title">Completed Instructions</span>
        <span className="stat-number">{loadingStats ? "-" : stats.completed}</span>
      </div>
    </div>
  );

  const CardFront2 = () => (
    <div className="stat-card-face">
      <div className="stat-icon"><FiBookOpen /></div>
      <div className="stat-texts">
        <span className="stat-title">New Instructions</span>
        <span className="stat-number">{loadingStats ? "-" : stats.new}</span>
      </div>
    </div>
  );

  const CardBack2 = () => (
    <div className="stat-card-face">
      <div className="stat-icon warning"><FiActivity /></div>
      <div className="stat-texts">
        <span className="stat-title">In Progress Instructions</span>
        <span className="stat-number">{loadingStats ? "-" : stats.in_progress}</span>
      </div>
    </div>
  );

  return (
    <div className="landing">
      <div
        className="landing-bg-base"
        role="img"
        aria-label="Decorative background"
        style={{ backgroundImage: `url(${baseImage})` }}
      />
      <div
        className={`landing-bg-overlay ${isCrossfading ? "visible" : ""}`}
        aria-hidden="true"
        style={{ backgroundImage: `url(${overlayImage})` }}
      />
      <div className="landing-bg-tint" aria-hidden="true" />
      <Header
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />
      <div className="landing-content">
        <div className="intro-panel">
          <div className="intro-brand">
            <img
              src="/images/whizz-away.jpeg"
              alt="Whizz-Away logo"
              className="intro-logo"
            />
            <span className="intro-name">Whizz-Away</span>
          </div>
          <h1 className="intro-title">Operate Smarter. Move Faster.</h1>
          <p className="intro-desc">
            Whizz-Away: one platform for logistics, payments, and analytics to keep every delivery on time.
          </p>
        </div>
        <div className="stats-panel">
          <div className={`flip-card ${flipped ? "flipped" : ""}`}>
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <CardFront1 />
              </div>
              <div className="flip-card-back">
                <CardBack1 />
              </div>
            </div>
          </div>

          <div className={`flip-card ${flipped ? "flipped" : ""}`}>
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <CardFront2 />
              </div>
              <div className="flip-card-back">
                <CardBack2 />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for login/register - using key prop to force remount when form changes */}
      <Modal
        key={modalForm}
        isOpen={isModalOpen}
        onClose={closeModal}
        initialForm={modalForm}
      />
      <Footer />
    </div>
  )
};

export default LandingPage;
