import React from 'react';
import Card from './Card';
import * as state from './state';

class ColdTransfer extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            buffer: '',
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        const noPunct = this.state.buffer.replace(/\W/g, ' ');
        const uniformWs = noPunct.replace(/\s+/g, ' ');
        const skills = uniformWs.split(' ');
        this.props.transfer(skills);
    }

    handleChange(event) {
        this.setState({ buffer: event.target.value });
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                <div className="form-group">
                    <label className="col-form-label">
                        Skills required for next hop
                        <textarea className="form-control" rows="3" value={this.state.value} onChange={this.handleChange} />
                    </label>
                </div>
                <div className="form-group">
                    <input className="btn btn-danger" type="submit" value="Cold Transfer" />
                </div>
            </form>
        );
    }
}

function SoftPhone(props) {
    const handleClearClick = (e) => {
        e.preventDefault();
        props.clear();
    };

    const handleHoldCustomerClick = (e) => {
        e.preventDefault();
        props.holdCustomer();
    };

    switch (props.state) {
    case state.Call.OFFLINE:
        return <Card title="Soft Phone" subtitle="offline" />;

    case state.Call.CLEAR:
        return <Card title="Soft Phone" subtitle="clear" />;

    case state.Call.ALERTING:
        return <Card title="Soft Phone" subtitle="alerting" />;

    case state.Call.ESTABLISHED:
        return (
            <Card title="Soft Phone" subtitle="established">
                <div className="card-body">
                    <p className="card-text">responding to call request</p>
                    <button className="btn btn-danger" onClick={handleClearClick}>
                        Clear
                    </button>
                </div>

                <div className="card-body">
                    <button className="btn btn-danger" onClick={handleHoldCustomerClick}>
                        Hold Customer
                    </button>
                </div>

                <div className="card-body">
                    <ColdTransfer transfer={props.coldTransfer} />
                </div>
            </Card>
        );

    default:
        throw new Error('unknown call state');
    }
}

export default SoftPhone;
