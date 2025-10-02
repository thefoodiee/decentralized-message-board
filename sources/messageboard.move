module sire::MessageBoard {
    use aptos_framework::signer;
    use aptos_framework::timestamp;
    use std::string::String;
    use std::vector;

    /// Struct representing a single message on the board
    struct Message has store, copy, drop {
        author: address,
        content: String,
        timestamp: u64,
    }

    /// Struct representing the message board
    struct Board has key {
        messages: vector<Message>,
    }

    /// Function to initialize the message board
    public entry fun initialize_board(account: &signer) {
        let board = Board {
            messages: vector::empty<Message>(),
        };
        move_to(account, board);
    }

    /// Function to post a message to the board
    public entry fun post_message(
        account: &signer,
        board_owner: address,
        content: String
    ) acquires Board {
        let board = borrow_global_mut<Board>(board_owner);
        
        let message = Message {
            author: signer::address_of(account),
            content,
            timestamp: timestamp::now_seconds(),
        };
        
        vector::push_back(&mut board.messages, message);
    }

    #[view]
    public fun get_messages(board_owner: address): vector<Message> acquires Board {
        let board = borrow_global<Board>(board_owner);
        *&board.messages
    }

    #[view]
    public fun get_message_count(board_owner: address): u64 acquires Board {
        let board = borrow_global<Board>(board_owner);
        vector::length(&board.messages)
    }
}
