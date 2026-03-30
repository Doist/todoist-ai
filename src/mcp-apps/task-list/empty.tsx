import styles from './empty.module.css'

import emptySvg from './empty.svg'

function Empty() {
    return (
        <div className={styles.emptyContainer}>
            <img className={styles.emptyImage} src={emptySvg} alt="No tasks" />
            <p className={styles.emptyText}>No tasks found.</p>
        </div>
    )
}
export { Empty }
