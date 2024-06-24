import {Component} from 'react'
import './index.css'

class ClickCounter extends Component {
  state = {count: 0}

  increment = () => {
    this.setState(stateCount => ({count: stateCount.count + 1}))
  }

  render() {
    const {count} = this.state
    return (
      <div className="bg-container">
        <div className="counter-container">
          <h1 className="counter-heading">
            The Buttton has been clicked
            <br />
            <span className="counter-element">
              {' '}
              {count === 0 ? String(0) : String(count)}
            </span>{' '}
            times
          </h1>
          <p className="counter-instruction">
            click the button to increase the count!
          </p>
          <button type="button" className="button" onClick={this.increment}>
            Click Me!
          </button>
        </div>
      </div>
    )
  }
}

export default ClickCounter
