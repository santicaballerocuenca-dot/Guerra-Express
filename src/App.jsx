import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, getDocs, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';

// Comprobamos si las variables de entorno de Firebase están definidas
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
import React, { useState, useEffect } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, updateDoc, arrayUnion } from 'firebase/firestore';


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBAMGkwLrCQbgnSYtrugNn17zPeV3zz6Ys",
    authDomain: "resiclasiadatos.firebaseapp.com",
    projectId: "resiclasiadatos",
    storageBucket: "resiclasiadatos.firebasestorage.app",
    messagingSenderId: "740346277859",
    appId: "1:740346277859:web:04ee0060e0daf01f07fad6"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const app = firebaseApp;


// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Funciones auxiliares para la interfaz de usuario con iconos SVG en línea
const FactionIcon = ({ name }) => {
    switch (name) {
        case 'La Gian y la Ussr':
            return (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                    <path d="M12 2v20" />
                    <path d="M16 12h-8" />
                </svg>
            );
        case 'Francia':
            return (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                    <path d="M12 18v-6h-6" />
                </svg>
            );
        default:
            return (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v10" />
                    <path d="M18.4 6.6L12 12l-6.4-5.4" />
                    <path d="M12 12l-6.4 5.4" />
                    <path d="M12 12l6.4 5.4" />
                </svg>
            );
    }
};

const PlayerCard = ({ player, isCurrentPlayer, isTurn }) => (
    <div className={`flex items-center space-x-4 p-4 rounded-lg shadow-inner ${isTurn ? 'bg-indigo-600' : 'bg-gray-800'}`}>
        <div className="flex-shrink-0">
            <FactionIcon name={player.faction} />
        </div>
        <div className="flex-grow">
            <p className="text-sm font-semibold text-gray-300">Jugador ID:</p>
            <p className="text-xs break-all text-gray-400">{player.id}</p>
            <p className="text-sm text-gray-400">Oro: ${player.gold} | Rango: {player.role}</p>
        </div>
        <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: player.faction === 'La Gian' ? '#f43f5e' : '#3b82f6', color: '#fff' }}>
                {player.faction}
            </span>
        </div>
    </div>
);

const App = () => {
    const [userId, setUserId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

    const [gameStatus, setGameStatus] = useState('lobby');
    const [currentPlayerId, setCurrentPlayerId] = useState(null);
    const [teamPV, setTeamPV] = useState({ 'La Gian': 100, 'la ussr': 100 });
    const [teamGold, setTeamGold] = useState({ 'La Gian': 500, 'la ussr': 500 });
    const [teamFM, setTeamFM] = useState({ 'La Gian': 10, 'la ussr': 10 });
    const [gameLog, setGameLog] = useState([]);
    const [winner, setWinner] = useState(null);
    const [doctrines, setDoctrines] = useState({});

    const factions = ['La Gian', 'la ussr'];

    // Referencias a la colección y al documento de Firestore
    let playersCollectionRef;
    let gameStateDocRef;

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 767);
        };

        window.addEventListener('resize', handleResize);

        const authenticate = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Error durante la autenticación:", error);
            }
        };

        authenticate();

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            } else {
                setUserId(crypto.randomUUID());
                setIsAuthReady(true);
            }
        });

        return () => {
            unsubscribeAuth();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        // Asegurar que la autenticación está lista y que un usuario ha sido asignado antes de escuchar la base de datos
        if (!isAuthReady || !userId || !auth.currentUser) {
            console.log("Esperando a que la autenticación de Firestore esté lista...");
            return;
        }

        playersCollectionRef = collection(db, `artifacts/${appId}/public/data/players`);
        gameStateDocRef = doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game');

        const unsubscribePlayers = onSnapshot(playersCollectionRef, (snapshot) => {
            const playersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPlayers(playersData);
        }, (error) => {
            console.error("Error al escuchar la colección de jugadores:", error);
        });

        const unsubscribeGameState = onSnapshot(gameStateDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const gameState = docSnapshot.data();
                setGameStatus(gameState.status);
                setCurrentPlayerId(gameState.currentPlayerId);
                setWinner(gameState.winner);
                setTeamPV(gameState.teamPV || { 'La Gian': 100, 'la ussr': 100 });
                setTeamGold(gameState.teamGold || { 'La Gian': 500, 'la ussr': 500 });
                setTeamFM(gameState.teamFM || { 'La Gian': 10, 'la ussr': 10 });
                setGameLog(gameState.gameLog || []);
                setDoctrines(gameState.doctrines || {});

                if (gameState.teamPV?.['La Gian'] <= 0) {
                    setWinner('la ussr');
                    setGameStatus('finished');
                } else if (gameState.teamPV?.['la ussr'] <= 0) {
                    setWinner('La Gian');
                    setGameStatus('finished');
                }
            } else {
                setGameStatus('lobby');
                setCurrentPlayerId(null);
                setWinner(null);
                setTeamPV({ 'La Gian': 100, 'la ussr': 100 });
                setTeamGold({ 'La Gian': 500, 'la ussr': 500 });
                setTeamFM({ 'La Gian': 10, 'la ussr': 10 });
                setGameLog([]);
                setDoctrines({});
            }
        }, (error) => {
            console.error("Error al escuchar el estado del juego:", error);
        });

        return () => {
            unsubscribePlayers();
            unsubscribeGameState();
        };
    }, [isAuthReady, userId]);

    const selectFaction = async (factionName) => {
        if (!userId) return;
        const playerDocRef = doc(db, `artifacts/${appId}/public/data/players`, userId);
        try {
            await setDoc(playerDocRef, {
                id: userId,
                faction: factionName,
                gold: 100,
                role: 'Soldado', // Por defecto, todos son soldados
                defenses: [],
                lastAttackTime: 0,
                timestamp: Date.now(),
            }, { merge: true });
        } catch (error) {
            console.error("Error al seleccionar la facción:", error);
        }
    };

    const startGame = async () => {
        if (players.length < 2) return;
        try {
            const laGianPlayers = players.filter(p => p.faction === 'La Gian');
            const ussrPlayers = players.filter(p => p.faction === 'la ussr');

            if (laGianPlayers.length === 0 || ussrPlayers.length === 0) {
                // Usar un mensaje personalizado en lugar de alert
                console.warn("Necesitas al menos un jugador en cada equipo para empezar.");
                return;
            }

            // Asignar rangos aleatoriamente
            const assignRanks = (teamPlayers) => {
                const shuffled = [...teamPlayers].sort(() => 0.5 - Math.random());
                const roles = ['Presidente', 'General'];
                const numOfficers = Math.min(2, shuffled.length - roles.length);
                for (let i = 0; i < numOfficers; i++) roles.push('Oficial');
                while (roles.length < shuffled.length) roles.push('Soldado');

                shuffled.forEach((player, index) => {
                    updateDoc(doc(db, `artifacts/${appId}/public/data/players`, player.id), { role: roles[index] });
                });
            };

            assignRanks(laGianPlayers);
            assignRanks(ussrPlayers);

            const randomPlayer = players[Math.floor(Math.random() * players.length)];
            await setDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'), {
                status: 'doctrine-selection',
                currentPlayerId: randomPlayer.id,
                teamPV: { 'La Gian': 100, 'la ussr': 100 },
                teamGold: { 'La Gian': 500, 'la ussr': 500 },
                teamFM: { 'La Gian': 10, 'la ussr': 10 },
                gameLog: [{ message: '¡La partida ha comenzado! Los líderes deben elegir su doctrina.', timestamp: Date.now() }],
                winner: null,
                doctrines: {}
            });

        } catch (error) {
            console.error("Error al iniciar la partida:", error);
        }
    };

    const selectDoctrine = async (doctrine) => {
        const player = players.find(p => p.id === userId);
        if (!player || player.role !== 'Presidente' || doctrines[player.faction]) return;

        try {
            const newDoctrines = { ...doctrines, [player.faction]: doctrine };
            await updateDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'), {
                doctrines: newDoctrines,
                gameLog: arrayUnion({ message: `El líder de ${player.faction} ha elegido su doctrina.`, timestamp: Date.now() })
            });

            if (newDoctrines['La Gian'] && newDoctrines['la ussr']) {
                await updateDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'), {
                    status: 'in-progress'
                });
            }
        } catch (error) {
            console.error("Error al seleccionar la doctrina:", error);
        }
    };

    const getDoctrineModifiers = (faction) => {
        const doctrine = doctrines[faction];
        if (!doctrine) return { damage: 0, costModifier: 1 };
        switch (doctrine) {
            case 'Doctrina de Choque': return { damage: 1, costModifier: 1.1 };
            case 'Doctrina de Resistencia': return { damage: -1, costModifier: 0.8 };
            case 'Doctrina de Nación Rica': return { damage: 0, costModifier: 1.25 };
            case 'Doctrina Estándar': return { damage: 0, costModifier: 1 };
            default: return { damage: 0, costModifier: 1 };
        }
    };

    // Lógica de juego para ataques
    const sendTankAttack = async () => {
        const player = players.find(p => p.id === userId);
        if (!player || gameStatus !== 'in-progress' || player.id !== currentPlayerId) return;
        if (player.role !== 'General' && player.role !== 'Soldado') return;

        const { damage: doctrineDamage } = getDoctrineModifiers(player.faction);
        const damage = 1 + doctrineDamage;

        const enemyFaction = player.faction === 'La Gian' ? 'la ussr' : 'La Gian';
        const newTeamPV = { ...teamPV, [enemyFaction]: teamPV[enemyFaction] - damage };

        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'), {
                teamPV: newTeamPV,
                gameLog: arrayUnion({ message: `[${player.faction}] El jugador ${player.id} ataca con Tanque 🚜, infligiendo ${damage} PV.`, timestamp: Date.now() })
            });
            passTurn();
        } catch (error) {
            console.error("Error al enviar ataque de tanque:", error);
        }
    };

    const sendArtilleryAttack = async () => {
        const player = players.find(p => p.id === userId);
        if (!player || gameStatus !== 'in-progress' || player.id !== currentPlayerId) return;
        if (player.role !== 'General') return;

        const { costModifier } = getDoctrineModifiers(player.faction);
        const cost = 20 * costModifier;
        if (player.gold < cost) return;

        const enemyFaction = player.faction === 'La Gian' ? 'la ussr' : 'La Gian';
        const newTeamPV = { ...teamPV, [enemyFaction]: teamPV[enemyFaction] - 3 };

        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'), {
                teamPV: newTeamPV,
                gameLog: arrayUnion({ message: `[${player.faction}] El jugador ${player.id} usa Artillería 💣, infligiendo 3 PV.`, timestamp: Date.now() })
            });
            await updateDoc(doc(db, `artifacts/${appId}/public/data/players`, userId), { gold: player.gold - cost });
            passTurn();
        } catch (error) {
            console.error("Error al enviar ataque de artillería:", error);
        }
    };

    const sendNuclearAttack = async () => {
        const player = players.find(p => p.id === userId);
        if (!player || gameStatus !== 'in-progress' || player.id !== currentPlayerId) return;
        if (player.role !== 'Presidente') return;

        const { costModifier } = getDoctrineModifiers(player.faction);
        const cost = 50 * costModifier;
        if (teamGold[player.faction] < cost) return;

        const enemyFaction = player.faction === 'La Gian' ? 'la ussr' : 'La Gian';
        const newTeamPV = { ...teamPV, [enemyFaction]: teamPV[enemyFaction] - 10, [player.faction]: teamPV[player.faction] - 3 };
        const newTeamGold = { ...teamGold, [player.faction]: teamGold[player.faction] - cost };

        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'), {
                teamPV: newTeamPV,
                teamGold: newTeamGold,
                gameLog: arrayUnion({ message: `[${player.faction}] ¡El PRESIDENTE ${player.id} ha lanzado una Bomba Nuclear! ☢`, timestamp: Date.now() })
            });
            passTurn();
        } catch (error) {
            console.error("Error al lanzar ataque nuclear:", error);
        }
    };

    // Lógica para defensas
    const deployShield = async () => {
        const player = players.find(p => p.id === userId);
        if (!player || gameStatus !== 'in-progress' || player.id !== currentPlayerId) return;
        if (player.role !== 'Oficial') return;

        const { costModifier } = getDoctrineModifiers(player.faction);
        const cost = 15 * costModifier;
        if (player.gold < cost) return;

        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/players`, userId), {
                gold: player.gold - cost,
                defenses: arrayUnion({ type: 'shield', active: true })
            });
            await updateDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'), {
                gameLog: arrayUnion({ message: `[${player.faction}] El OFICIAL ${player.id} despliega un Escudo 🛡.`, timestamp: Date.now() })
            });
            passTurn();
        } catch (error) {
            console.error("Error al desplegar escudo:", error);
        }
    };

    // Lógica para reiniciar la partida
    const restartGame = async () => {
        try {
            const playersSnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/players`));
            playersSnapshot.forEach(async (playerDoc) => {
                await deleteDoc(playerDoc.ref);
            });
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'));
        } catch (error) {
            console.error("Error al reiniciar la partida:", error);
        }
    };

    const passTurn = async () => {
        if (gameStatus !== 'in-progress' && gameStatus !== 'doctrine-selection') return;

        const playersInGame = players.filter(p => p.faction);
        if (playersInGame.length > 0) {
            const currentIndex = playersInGame.findIndex(p => p.id === currentPlayerId);
            const nextIndex = (currentIndex + 1) % playersInGame.length;
            const nextPlayer = playersInGame[nextIndex];
            await updateDoc(doc(db, `artifacts/${appId}/public/data/game_state`, 'current_game'), {
                currentPlayerId: nextPlayer.id,
            });
        }
    };

    const currentPlayer = players.find(p => p.id === userId);
    const isCurrentPlayerTurn = currentPlayer && currentPlayerId === userId;
    const isLeader = currentPlayer && currentPlayer.role === 'Presidente';
    const enemyFaction = currentPlayer && currentPlayer.faction === 'La Gian' ? 'la ussr' : 'La Gian';

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-2xl shadow-xl space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
                        Batalla de Facciones
                    </h1>
                    <p className="mt-2 text-sm text-gray-400">
                        Elige tu bando y únete a la batalla.
                    </p>
                    <div className="mt-4 p-2 bg-gray-700 rounded-lg text-xs break-all">
                        <span className="font-semibold text-gray-300">Tu ID de Jugador: </span>
                        <span className="text-gray-400">{userId || 'Cargando...'}</span>
                    </div>
                </header>

                {gameStatus === 'lobby' && (
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-200">Selecciona tu facción</h2>
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
                            {factions.map((faction) => (
                                <button
                                    key={faction}
                                    onClick={() => selectFaction(faction)}
                                    className={`${faction === 'La Gian' ? 'bg-rose-500' : 'bg-blue-500'
                                        } transform transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 text-white font-bold py-6 px-8 rounded-xl shadow-lg flex flex-col items-center justify-center space-y-3 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-${faction === 'La Gian' ? 'rose-500' : 'blue-500'
                                        } focus:ring-offset-gray-800`}
                                >
                                    <FactionIcon name={faction} />
                                    <span className="text-lg">{faction}</span>
                                </button>
                            ))}
                        </div>
                        {players.filter(p => p.faction).length >= 2 && (
                            <div className="text-center mt-6">
                                <button
                                    onClick={startGame}
                                    className="w-full sm:w-auto px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-colors duration-200"
                                >
                                    Iniciar partida
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {gameStatus === 'doctrine-selection' && isCurrentPlayerTurn && currentPlayer?.role === 'Presidente' && (
                    <section className="space-y-4 text-center">
                        <h2 className="text-2xl font-bold text-gray-200">Selecciona la doctrina de tu equipo</h2>
                        <p className="text-sm text-gray-400">Esta decisión es secreta.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => selectDoctrine('Doctrina de Choque')} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg shadow-md">
                                Doctrina de Choque
                            </button>
                            <button onClick={() => selectDoctrine('Doctrina de Resistencia')} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md">
                                Doctrina de Resistencia
                            </button>
                            <button onClick={() => selectDoctrine('Doctrina de Nación Rica')} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md">
                                Doctrina de Nación Rica
                            </button>
                            <button onClick={() => selectDoctrine('Doctrina Estándar')} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-lg shadow-md">
                                Doctrina Estándar
                            </button>
                        </div>
                        <button
                            onClick={passTurn}
                            className="w-full sm:w-auto px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-lg shadow-md transition-colors duration-200 mt-4"
                        >
                            Pasar turno
                        </button>
                    </section>
                )}

                {gameStatus === 'in-progress' && (
                    <section className="text-center space-y-4">
                        <h2 className="text-3xl font-bold text-gray-200">Partida en curso</h2>
                        <div className="flex justify-around text-center my-4">
                            <div>
                                <h3 className="text-xl font-semibold text-rose-400">La Gian</h3>
                                <p className="text-3xl font-bold">{teamPV['La Gian']}</p>
                                <p className="text-sm text-gray-400">Oro: ${teamGold['La Gian']} | FM: {teamFM['La Gian']}</p>
                            </div>
                            <p className="text-2xl text-gray-400">PV</p>
                            <div>
                                <h3 className="text-xl font-semibold text-blue-400">la ussr</h3>
                                <p className="text-3xl font-bold">{teamPV['la ussr']}</p>
                                <p className="text-sm text-gray-400">Oro: ${teamGold['la ussr']} | FM: {teamFM['la ussr']}</p>
                            </div>
                        </div>
                        <p className="text-lg text-gray-400">
                            Es el turno de: <span className="font-bold text-indigo-400">{isCurrentPlayerTurn ? 'Tú' : currentPlayerId}</span>
                        </p>
                        {isCurrentPlayerTurn && (
                            <div className="flex flex-col space-y-4 items-center">
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={sendTankAttack}
                                        disabled={!['General', 'Soldado'].includes(currentPlayer?.role)}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50"
                                    >
                                        Tanque 🚜 (Gratis)
                                    </button>
                                    <button
                                        onClick={sendArtilleryAttack}
                                        disabled={!['General'].includes(currentPlayer?.role)}
                                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50"
                                    >
                                        Artillería 💣 ($20)
                                    </button>
                                    <button
                                        onClick={deployShield}
                                        disabled={!['Oficial'].includes(currentPlayer?.role)}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50"
                                    >
                                        Escudo 🛡 ($15)
                                    </button>
                                    <button
                                        onClick={sendNuclearAttack}
                                        disabled={!['Presidente'].includes(currentPlayer?.role)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50"
                                    >
                                        Bomba Nuclear ☢ ($50)
                                    </button>
                                </div>
                                <button
                                    onClick={passTurn}
                                    className="w-full sm:w-auto px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-lg shadow-md transition-colors duration-200 mt-4"
                                >
                                    Pasar turno
                                </button>
                            </div>
                        )}
                        <div className="mt-8 p-4 bg-gray-700 rounded-lg max-h-40 overflow-y-auto text-left text-sm">
                            <h3 className="font-semibold text-gray-200 mb-2">Registro de Guerra:</h3>
                            {gameLog.map((log, index) => (
                                <p key={index} className="text-gray-400 leading-tight">{log.message}</p>
                            ))}
                        </div>
                    </section>
                )}

                {gameStatus === 'finished' && (
                    <section className="text-center space-y-4">
                        <h2 className="text-4xl font-extrabold text-green-400">¡Partida terminada!</h2>
                        <p className="text-lg text-gray-400">
                            El ganador es: <span className="font-bold text-indigo-400">{winner}</span>
                        </p>
                        <button
                            onClick={restartGame}
                            className="w-full sm:w-auto px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-md transition-colors duration-200"
                        >
                            Reiniciar partida
                        </button>
                    </section>
                )}

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-200">Jugadores en la partida</h2>
                    <div className="bg-gray-700 p-4 rounded-xl shadow-inner max-h-60 overflow-y-auto space-y-4">
                        {players.length > 0 ? (
                            players.map((player) => (
                                <PlayerCard
                                    key={player.id}
                                    player={player}
                                    isCurrentPlayer={player.id === userId}
                                    isTurn={player.id === currentPlayerId}
                                />
                            ))
                        ) : (
                            <p className="text-center text-gray-400">No hay jugadores en la partida. ¡Sé el primero en unirte!</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default App;
