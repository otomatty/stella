public class Q26MaxOfTests
{
    [Fact(DisplayName = "Q26 配列の最大")]
    public void Q26MaxOf()
    {
        Assert.Equal(9, Answers.Q26MaxOf(new int[] { 3, 9, 4 }));
        Assert.Equal(7, Answers.Q26MaxOf(new int[] { 7 }));
    }
}
