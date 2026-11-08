public class Q28SumToTests
{
    [Fact(DisplayName = "Q28 1からnの合計")]
    public void Q28SumTo()
    {
        Assert.Equal(10, Answers.Q28SumTo(4));
        Assert.Equal(55, Answers.Q28SumTo(10));
        Assert.Equal(1, Answers.Q28SumTo(1));
    }
}
