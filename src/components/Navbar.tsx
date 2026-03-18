import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-lg border-b border-white/5 py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          
          <Link to="/" className="flex items-center group">
            <img src="/logo-full.svg" alt="Adezi Logo" className="h-8 transition-transform group-hover:scale-105" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-white transition-colors text-sm font-medium">Recursos</a>
            <a href="#about" className="text-muted-foreground hover:text-white transition-colors text-sm font-medium">Sobre</a>
            
            <div className="flex items-center space-x-4 pl-4 border-l border-white/10">
              <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">
                Entrar
              </Link>
              <Link to="/register" className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center group">
                Começar <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="md:hidden glass border-t border-white/5 mt-4 pb-4"
        >
          <div className="flex flex-col space-y-4 px-4 py-6">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Recursos</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Sobre</a>
            <hr className="border-white/10" />
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Entrar</Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="bg-primary text-primary-foreground text-center py-3 rounded-xl font-bold">
              Começar Agora
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
