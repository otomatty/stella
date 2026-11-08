public class Q07GreaterThanTests
{
    [Fact(DisplayName = "Q07 Nより大きいか")]
    public void Q07GreaterThan()
    {
        Assert.Equal(true, Answers.Q07GreaterThan(101, 100));
        Assert.Equal(false, Answers.Q07GreaterThan(100, 100));
    }
}
