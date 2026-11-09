public class Q11SumOfTests
{
    [Fact(DisplayName = "Q11 合計")]
    public void Q11SumOf()
    {
        Assert.Equal(16, Answers.Q11SumOf(new int[] { 3, 9, 4 }));
        Assert.Equal(5, Answers.Q11SumOf(new int[] { 5 }));
        Assert.Equal(18, Answers.Q11SumOf(new int[] { 11, 3, 4 }));
    }
}
