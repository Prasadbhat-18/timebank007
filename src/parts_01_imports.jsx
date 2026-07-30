import { useState, useEffect, useRef, useCallback, cloneElement, isValidElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { io } from "socket.io-client";
import { nanoid } from "nanoid";
import { AICTE_CFG, LEVEL_CFG, BADGES, NOTIF_ICONS } from "./store.js";
import * as api from "./api.js";
import * as chain from "./blockchain.js";

// Ensure socket connection
let socket;
function getSocket(userId) {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      transports: ["websocket", "polling"],
    });
  }
  if (userId) {
    socket.emit("join", userId);
  }
  return socket;
}

const scaleUp = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } };
