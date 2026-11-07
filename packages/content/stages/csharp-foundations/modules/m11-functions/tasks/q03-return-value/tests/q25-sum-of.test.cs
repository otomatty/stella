public class Q25SumOfTests
{
    [Fact(DisplayName = "Q25 配列の合計")]
    public void Q25SumOf()
    {
        Assert.Equal(16, Answers.Q25SumOf(new int[] { 3, 9, 4 }));
        Assert.Equal(5, Answers.Q25SumOf(new int[] { 5 }));
    }
}
