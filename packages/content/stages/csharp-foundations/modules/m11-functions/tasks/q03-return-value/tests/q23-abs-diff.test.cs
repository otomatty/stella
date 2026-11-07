public class Q23AbsDiffTests
{
    [Fact(DisplayName = "Q23 差の絶対値")]
    public void Q23AbsDiff()
    {
        Assert.Equal(7, Answers.Q23AbsDiff(10, 3));
        Assert.Equal(7, Answers.Q23AbsDiff(3, 10));
        Assert.Equal(0, Answers.Q23AbsDiff(4, 4));
    }
}
