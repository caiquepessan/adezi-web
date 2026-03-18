import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReCAPTCHA from 'react-google-recaptcha';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (lockoutTime && Date.now() < lockoutTime) {
      const remainingSeconds = Math.ceil((lockoutTime - Date.now()) / 1000);
      setErrorMsg(`Muitas tentativas falhas. Tente novamente em ${remainingSeconds} segundos.`);
      setLoading(false);
      return;
    }

    if (!captchaToken) {
      setErrorMsg('Por favor, confirme que você não é um robô (Captcha).');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      setFailedAttempts(0);
      setLockoutTime(null);
      // Successfully logged in
      navigate('/portal');
      
    } catch (error: any) {
      console.error("Login error:", error);
      
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setLockoutTime(Date.now() + 60000); // 1 minuto de bloqueio local
        setErrorMsg("Muitas tentativas falhas. Aguarde 1 minuto para evitar bloqueio por spam da sua rede.");
      } else {
        setErrorMsg(error.message || "Email ou senha incorretos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-indigo-500/10 rounded-full blur-[120px] opacity-30" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[100px] opacity-40" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-8 items-center">
          <Link to="/" className="flex items-center group">
             <img src="/logo-full.svg" alt="Adezi Logo" className="h-10 transition-transform group-hover:scale-105" />
          </Link>
        </div>

        <div className="glass-panel p-8 rounded-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Bem-vindo de volta</h2>
            <p className="text-muted-foreground">Acesse o seu painel de controle</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-muted-foreground">Senha</label>
                <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">Esqueceu a senha?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm mb-4">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-center py-2 mb-2">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                onChange={(token) => setCaptchaToken(token)}
                theme="dark"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              {loading ? 'Acessando...' : 'Entrar no Painel'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?{' '}
            <Link to="/register" className="text-white hover:text-primary transition-colors font-medium">
              Crie uma agora
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
