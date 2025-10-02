import { useState, useEffect } from 'react';
import { AptosClient, Types, HexString } from 'aptos';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design';
import '@aptos-labs/wallet-adapter-ant-design/dist/index.css';

// Update these values after deployment
const NODE_URL = "https://fullnode.devnet.aptoslabs.com/v1";
const MODULE_ADDRESS = "0x57744e3994ef2cb7f18f0a3c9ad78635272850fcd9a36be998fee780d424736e";

interface Message {
  author: string;
  content: string;
  timestamp: string;
}

function App() {
  const wallet = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const client = new AptosClient(NODE_URL);

  // Check if board is initialized
  const checkBoardInitialized = async () => {
    try {
      await client.getAccountResource(
        MODULE_ADDRESS,
        `${MODULE_ADDRESS}::MessageBoard::Board`
      );
      setInitialized(true);
      return true;
    } catch (error) {
      setInitialized(false);
      return false;
    }
  };

  // Fetch messages from the blockchain
  const fetchMessages = async () => {
    try {
      const isInit = await checkBoardInitialized();
      if (!isInit) return;

      const payload: Types.ViewRequest = {
        function: `${MODULE_ADDRESS}::MessageBoard::get_messages`,
        type_arguments: [],
        arguments: [MODULE_ADDRESS],
      };

      const result = await client.view(payload);
      const messagesData = result[0] as any[];
      
      const formattedMessages = messagesData.map((msg: any) => ({
        author: msg.author,
        content: msg.content,
        timestamp: new Date(parseInt(msg.timestamp) * 1000).toLocaleString(),
      }));

      setMessages(formattedMessages.reverse());
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Initialize the message board
  const initializeBoard = async () => {
    if (!wallet.account) {
      alert('Please connect your wallet first!');
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        type: 'entry_function_payload',
        function: `${MODULE_ADDRESS}::MessageBoard::initialize_board`,
        type_arguments: [],
        arguments: [],
      };

      const pendingTransaction = await (window as any).aptos.signAndSubmitTransaction(transaction);
      
      await client.waitForTransaction(pendingTransaction.hash);
      alert('Message board initialized successfully!');
      setInitialized(true);
      await fetchMessages();
    } catch (error: any) {
      console.error('Error initializing board:', error);
      alert('Failed to initialize board: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Post a new message
  const postMessage = async () => {
    if (!wallet.account) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!newMessage.trim()) {
      alert('Please enter a message!');
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        type: 'entry_function_payload',
        function: `${MODULE_ADDRESS}::MessageBoard::post_message`,
        type_arguments: [],
        arguments: [MODULE_ADDRESS, newMessage],
      };

      const pendingTransaction = await (window as any).aptos.signAndSubmitTransaction(transaction);
      
      await client.waitForTransaction(pendingTransaction.hash);
      setNewMessage('');
      alert('Message posted successfully!');
      await fetchMessages();
    } catch (error: any) {
      console.error('Error posting message:', error);
      alert('Failed to post message: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBoardInitialized();
    const interval = setInterval(fetchMessages, 10000);
    fetchMessages();
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            📝 Decentralized Message Board
          </h1>
          <WalletSelector />
        </div>

        {/* Connection Status */}
        {wallet.connected && wallet.account && (
          <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 rounded">
            <p className="text-green-700 text-sm">
              ✅ Connected: {String(wallet.account.address).slice(0, 6)}...{String(wallet.account.address).slice(-4)}
            </p>
          </div>
        )}

        {/* Initialize Board Section */}
        {!initialized && wallet.connected && wallet.account && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded">
            <p className="text-yellow-700 font-semibold mb-2">
              ⚠️ Message board not initialized
            </p>
            <button
              onClick={initializeBoard}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Initializing...' : 'Initialize Message Board'}
            </button>
          </div>
        )}

        {/* Post Message Section */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Post a Message
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write your message here..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!wallet.connected || !wallet.account || !initialized || loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading && wallet.connected && initialized) {
                  postMessage();
                }
              }}
            />
            <button
              onClick={postMessage}
              disabled={!wallet.connected || !wallet.account || !initialized || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
          {!wallet.connected && (
            <p className="text-red-500 text-sm mt-2">
              Please connect your wallet to post messages
            </p>
          )}
        </div>

        {/* Messages List */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Messages</h2>
            <button
              onClick={fetchMessages}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              🔄 Refresh
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-xl">No messages yet</p>
              <p className="text-sm mt-2">Be the first to post a message!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-mono text-blue-600">
                      {msg.author.slice(0, 6)}...{msg.author.slice(-4)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="text-gray-800">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white">
          <p className="text-sm">
            Built on Aptos Blockchain | Devnet
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;