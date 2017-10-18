import React from 'react';
import Card from './Card';

function Task(props) {
    return (
        <div>
            <dl className="dl-horizontal row">
                <dt className="col-4">account name</dt>
                <dd className="col-8">{props.task.attributes.accountName}</dd>

                <dt className="col-sm-4">account number</dt>
                <dd className="col-sm-8">{props.task.attributes.accountNumber}</dd>

                <dt className="col-sm-4">contact name</dt>
                <dd className="col-sm-8">{props.task.attributes.contactName}</dd>

                <dt className="col-sm-4">contact number</dt>
                <dd className="col-sm-8">{props.task.attributes.contactNumber}</dd>

                <dt className="col-sm-4">phone number</dt>
                <dd className="col-sm-8">{props.task.attributes.phoneNumber}</dd>

                <dt className="col-sm-4">request reason</dt>
                <dd className="col-sm-8">{props.task.attributes.requestReason}</dd>

                <dt className="col-sm-4">ticket number</dt>
                <dd className="col-sm-8">{props.task.attributes.ticketNumber}</dd>
            </dl>
        </div>
    );
}

function ActivitySelect(props) {

    let options = props.activities.map(a =>
        <option key={a.sid} value={a.sid}>
            {a.friendlyName}
        </option>
    );

    return (
        <select className="form-control" value={props.value} onChange={props.changeActivity}>
            {options}
        </select>);
}

class QueueTransfer extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            isWarm: false,
            taskQueueSid: props.taskQueues[0].sid,
        };

        this.handleTaskQueueChange = this.handleTaskQueueChange.bind(this);
        this.handleIsWarmChange = this.handleIsWarmChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleTaskQueueChange(event) {
        this.setState({ taskQueueSid: event.target.value });
        event.preventDefault();
    }

    handleIsWarmChange(event) {
        this.setState({ isWarm: event.target.checked });
        event.preventDefault();
    }

    handleSubmit(event) {
        if (this.state.isWarm) {
            this.props.warmTransfer();
        } else {
            this.props.blindTransfer();
        }

        event.preventDefault();
    };

    render() {

        let options = this.props.taskQueues.map(q =>
            <option key={q.sid} value={q.sid}>
                {q.friendlyName}
            </option>
        );

        return (
            <form onSubmit={this.handleSubmit}>
                <div className="form-row align-items-center">

                    <div className="col-auto">
                        <select
                            className="form-control"
                            id="inputQueue"
                            value={this.taskQueueSid}
                            onChange={this.handleTaskQueueChange}>
                            {options}
                        </select>
                    </div>

                    <div className="col-auto">
                        <div className="form-check mb-2 mb-sm-0">
                            <label className="form-check-label">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={this.state.isWarm}
                                    onChange={this.handleIsWarmChange} />
                                Warm
                            </label>
                        </div>
                    </div>

                    <div className="col-auto">
                        <button type="submit" className="btn btn-primary">Transfer to Queue</button>
                    </div>

                </div>
            </form>
        );
    }

}

function Work(props) {
    if (!props.worker || !props.activities || !props.taskQueues) {
        return <Card title="Work" subtitle="offline" />;
    }

    let subtitle = `${props.worker.friendlyName} (${props.worker.activityName})`;

    if (props.task) {
        return (
            <Card title="Work" subtitle={subtitle}>
                <Task task={props.task} />
                <QueueTransfer
                    taskQueues={props.taskQueues}
                    blindTransfer={props.blindTransfer}
                    warmTransfer={props.warmTransfer} />
            </Card>
        );
    }

    return (
        <Card title="Work" subtitle={subtitle}>

            <QueueTransfer
                taskQueues={props.taskQueues}
                blindTransfer={props.blindTransfer}
                warmTransfer={props.warmTransfer} />

            <ActivitySelect
                activities={props.activities}
                value={props.worker.activitySid}
                changeActivity={props.changeActivity} />
        </Card>
    );
}

export default Work;
