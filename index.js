import {Component} from 'react'
import './index.css'

class EvenOddApp extends Component {
  state = {count: 0}

  onIncrement = () => {
    const val = 0
    this.setState(() => ({count: val}))
  }

  render() {
    const {count} = this.state
    const counter = count % 2 === 0 ? 'Odd' : 'Even'

    return (
      <div className="bg-container">
        <div className="even-odd-container">
          <h1 className="heading">Count {count}</h1>
          <p className="counter">Count is {counter}</p>
          <button type="button" onClick={this.onIncrement} className="button">
            Increment
          </button>
          <p className="instruction">
            *Increase By Random Number Between 0 to 100
          </p>
        </div>
      </div>
    )
  }
}

export default EvenOddApp
