// public/js/login.js

// Se já está logado, redireciona direto
const _u = getUsuario();
if (_u && getToken()) {
  window.location.href = _u.papel === 'professor' ? '/professor.html' : '/aluno.html';
}

const formLogin  = document.getElementById('form-login');
const erroEl     = document.getElementById('login-erro');
const btnText    = document.querySelector('.btn-text');
const btnLoader  = document.querySelector('.btn-loader');

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroEl.classList.add('hidden');

  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  // Loading state
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');

  try {
    const data = await Auth.login(email, senha);
    salvarSessao(data);

    // Redireciona conforme papel (Diagrama Atividade 1 e 2)
    if (data.usuario.papel === 'professor') {
      window.location.href = '/professor.html';
    } else {
      window.location.href = '/aluno.html';
    }
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.classList.remove('hidden');
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
});
