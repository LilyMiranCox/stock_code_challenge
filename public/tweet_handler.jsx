class TweetHandler extends React.Component {
  constructor () {
    super();
    this.state = {
      tweets:[],
      stock_names:[],
      current_stock:""
    };
    this.interval = null;
  }

  refresh() { // Called when interval is up
    var handler_context = this;
    var position = 0;
    var new_tweets = [];
    var newState = {
      tweets:this.state.tweets,
      stock_names:this.state.stock_names,
      current_stock:this.state.current_stock
    };

    fetch("/stocks?symbol=" + this.state.current_stock) // Request this symbol from our backend server
    .then(res  => res.json()) // Parse the response
    .then(data => {

      while(data.messages[position].id != this.state.tweets[this.state.current_stock][0].id) {
        ++position; // Find at which index the new tweets stop
      }

      new_tweets = data.messages.slice(0, position); // Slice the new tweets from the received array
      new_tweets = new_tweets.concat(this.state.tweets[this.state.current_stock]); // Create a new array with new tweets in front of previous tweets
      newState.tweets[data.symbol.symbol] = new_tweets; // Set the concatinated array in the new state object

      handler_context.setState(newState);
    });
  }

  addSymbols() { // Called by updateFeed when "Add symbol" button is clicked
    var handler_context = this;
    var stock_symbols = document.getElementById("stock_symbols").value;
    var symbol_select = document.getElementById("symbol_select");
    var delete_button = document.getElementById("delete_button");

    stock_symbols = stock_symbols.toUpperCase();
    var symbols = stock_symbols.split(" "); // Array of symbols from the input

    var newState = {
      tweets:this.state.tweets,
      stock_names:this.state.stock_names,
      current_stock:symbols[0]
    };

    for(let i = 0; i < symbols.length; ++i) { // Loop through and request data for all symbols
      if(this.state.stock_names.hasOwnProperty(symbols[i]) == false) { // If the symbol was not already searched
        fetch("/stocks?symbol=" + symbols[i]) // Request this symbol from our backend server
        .then(res  => res.json()) // Parse response
        .then(data => {
          if(data.response.status != 404) { // If the symbol exists, was spelled correctly, and received a response
            newState.stock_names[data.symbol.symbol] = data.symbol.title; // Save the name of the new stock
            newState.tweets[data.symbol.symbol] = data.messages; // Save the received tweets

            if(Object.keys(newState.stock_names).length == 1) { // If this is the first symbol, make the select and delete button visible
              symbol_select.style.display  = "block";
              delete_button.style.display = "block";
            }
            handler_context.setState(newState); // Refresh shown tweets
          }
        });
      }
    }
    document.getElementById("stock_symbols").value = ""; // Clear input
  }

  switchSymbols = (e) =>  { // Called when a different option in the select element is selected
    var newState = {
      tweets:this.state.tweets,
      stock_names:this.state.stock_names,
      current_stock:this.state.current_stock
    };

    var toSearch = document.getElementById("symbol_select");
    newState.current_stock = toSearch.options[toSearch.selectedIndex].value;
    var handler_context = this;

    fetch("/stocks?symbol=" + newState.current_stock) // Request the data for the newly selected symbol
    .then(res  => res.json())
    .then(data => {
      var count = 0;
      var new_tweets = [];

      while(data.messages[count].id != this.state.tweets[newState.current_stock][0].id) {
        ++count;
      }

      new_tweets = data.messages.slice(0, count);
      new_tweets = new_tweets.concat(this.state.tweets[newState.current_stock]); // Concatinate new tweets in front of old tweets

      newState.tweets[data.symbol.symbol] = new_tweets;
      newState.current_stock = data.symbol.symbol;

      clearInterval(handler_context.interval); // Remove previous interval
      handler_context.interval = setInterval(()=>{ // Start new interval from now, and refresh (get tweet data from the server) when it is up
        handler_context.refresh();
      }, 60000);

      handler_context.setState(newState);
    });
  }

  removeSymbol = (e) => {
    var handler_context = this;
    var symbol_select = document.getElementById("symbol_select");
    var delete_button = document.getElementById("delete_button");
    var newState = {
      tweets:this.state.tweets,
      stock_names:this.state.stock_names,
      current_stock:this.state.current_stock
    };

    delete newState.stock_names[newState.current_stock]; // Remove current stock from name object
    delete newState.tweets[newState.current_stock]; // Remove current stock's tweets from the tweet object

    if(Object.keys(newState.stock_names).length == 0) { // If this was the last stock symbol
      newState.current_stock = "";
      symbol_select.style.display  = "none";
      delete_button.style.display = "none";
      this.setState(newState);
      return;
    }

    if(symbol_select.selectedIndex != 0) // If the removed symbol was not in the first index
      --symbol_select.selectedIndex;

    newState.current_stock = symbol_select.options[symbol_select.selectedIndex].value;

    fetch("/stocks?symbol=" + newState.current_stock)
    .then(res  => res.json())
    .then(data => {
      newState.tweets[data.symbol.symbol] = data.messages;
      newState.current_stock = data.symbol.symbol;

      if(handler_context.interval != null)
        clearInterval(handler_context.interval);

      handler_context.interval = setInterval(()=>{
        handler_context.refresh();
      }, 60000);

      handler_context.setState(newState);
      handler_context.switchSymbols();
    });
  }

  updateFeed = (e) => { // Called when the "Add symbol" button is pressed
    if(document.getElementById("stock_symbols").value == "") {
      return;
    }

    this.addSymbols();

    if(this.interval != null)
      clearInterval(this.interval);
    this.interval = setInterval(()=>{
      this.refresh();
    }, 60000);
  }

  render() {
    var feed = []; // Array of all tweets to be shown
    var dropdown_symbols = []; // Array of all options to be shown in the select

    if(Object.keys(this.state.stock_names).length > 0) {
      for(var i = 0; i < this.state.tweets[this.state.current_stock].length; ++i) { // Create a tweet element for each of the tweets belonging to the current symbol
        feed.push(
          <Tweet
            key={i}
            bodytext={this.state.tweets[this.state.current_stock][i].body}
            author={this.state.tweets[this.state.current_stock][i].user.name}
            username={this.state.tweets[this.state.current_stock][i].user.username}
            time={this.state.tweets[this.state.current_stock][i].created_at}>
          </Tweet>
        );
      }

      for(let stock in this.state.stock_names) { // Create an option for each searched symbol names, for the select
        dropdown_symbols.push(
        <option value={stock} key={stock}>{stock} ({this.state.tweets[stock].length})</option>
        );
      }
    }

    return (
      <div className="content">
        <p className="text-center">Enter one or more US stock symbols, space separated.</p>
        <div className="input-group my-3 px-5 d-flex justify-content-center">
          <input id="stock_symbols" pattern="[^a-zA-Z]+" type="text" className="form-control" placeholder="US stock symbol/s" aria-label="US stock symbol/s" aria-describedby="basic-addon2"/>
          <div className="input-group-append">
            <button className="btn btn-outline-secondary" type="button" onClick={this.updateFeed}>Add symbol</button>
          </div>
        </div>
        <div className="input-group my-3 px-5 d-flex justify-content-center">
          <select className="form-control" id="symbol_select" value={this.state.current_stock} onChange={this.switchSymbols}>
            {dropdown_symbols}
          </select>
          <div className="input-group-append">
            <button className="btn btn-outline-secondary" id="delete_button" type="button" onClick={this.removeSymbol}> Remove symbol </button>
          </div>
        </div>
      {feed}
      </div>
    );
  }

  componentDidMount() {
    var symbol_select = document.getElementById("symbol_select");
    var delete_button = document.getElementById("delete_button");

    if(Object.keys(this.state.stock_names).length == 0) { // If no symbols have been added yet, hide select and delete button
      symbol_select.style.display  = "none";
      delete_button.style.display = "none";
    }
  }
}

class Tweet extends React.Component {
  render() {
    return (
      <div className="card bg-light text-dark m-5">
      <dl>
        <dt className="font-weight-bold mx-3 mt-3">{this.props.author}</dt>
        <dd className="font-weight-light mx-3">@{this.props.username}</dd>
      </dl>
        <p className="mx-4">
          {this.props.bodytext}
        </p>
        <p className="font-weight-light mx-3">
          {this.props.time}
        </p>
      </div>
    );
  }
}

ReactDOM.render(<TweetHandler />, document.getElementById("tweet_feed"));
