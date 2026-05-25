import { motion, AnimatePresence } from 'framer-motion';

export const listItemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
};

export function MotionDiv(props: React.ComponentProps<typeof motion.div>) {
  return <motion.div {...props} />;
}

export function AnimateList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function MotionItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      layout
      variants={listItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: 'tween', duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}