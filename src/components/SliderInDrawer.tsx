import { useEffect } from "react";

interface SlideInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: "left" | "right"; // Specify position (default is right)
}

const SlideInDrawer = ({ isOpen, onClose, children, position = "right" }: SlideInDrawerProps) => {
  // Handle closing when clicking outside or pressing ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay (dim background) */}
      <div
        className={`fixed inset-0 bg-black transition-opacity z-[60] ${
          isOpen ? "opacity-50 visible" : "opacity-0 invisible"
        }`}
        onClick={onClose}
      ></div>

      {/* Slide-in Drawer */}
      <div
        className={`fixed top-0 ${position === "right" ? "right-0" : "left-0"}
          h-screen bg-white shadow-xl w-11/12 p-6 transform transition-transform z-[70]
          ${isOpen ? "translate-x-0" : position === "right" ? "translate-x-full" : "-translate-x-full"}`}
      >
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900">
          ✕
        </button>

        {/* Drawer Content */}
        <div className="overflow-y-auto max-h-[90vh]">{children}</div>
      </div>
    </>
  );
};

export default SlideInDrawer;
