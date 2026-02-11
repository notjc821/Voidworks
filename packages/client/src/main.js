import './style.css'; 
import GameClient from './GameClient';

window.onload = () => {
  const client = new GameClient();
  client.init();
};