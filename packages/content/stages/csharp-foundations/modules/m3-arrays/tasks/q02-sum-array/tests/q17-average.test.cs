public class Q17AverageTests
{
    [Fact(DisplayName = "Q17 平均")]
    public void Q17Average()
    {
        Assert.Equal(6, Answers.Q17Average(new int[] { 3, 9, 6 }));
        Assert.Equal(5, Answers.Q17Average(new int[] { 5 }));
        Assert.Equal(1, Answers.Q17Average(new int[] { 1, 1, 1, 1 }));
    }
}
