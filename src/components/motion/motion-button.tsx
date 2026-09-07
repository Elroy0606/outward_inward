"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

/** Button with tactile hover/tap micro-interactions, per the design system's motion rules. */
export const MotionButton = motion.create(Button);
